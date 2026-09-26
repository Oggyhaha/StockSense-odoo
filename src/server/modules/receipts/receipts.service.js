const crypto = require('crypto');
const db = require('../../database/connection');

class ReceiptsService {
    listReceipts(orgId, query = {}) {
        const { status, warehouseId, search, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['r.organization_id = ?'];
        let params = [orgId];

        if (status) {
            whereClauses.push('r.status = ?');
            params.push(status);
        }

        if (warehouseId) {
            whereClauses.push('r.warehouse_id = ?');
            params.push(warehouseId);
        }

        if (search) {
            whereClauses.push('(r.receipt_number LIKE ? OR r.supplier_name LIKE ? OR r.reference_number LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                r.id, r.receipt_number, r.supplier_name, r.status, r.expected_date,
                r.received_date, r.reference_number, r.notes, r.created_at,
                w.id as warehouse_id, w.name as warehouse_name,
                l.id as location_id, l.name as location_name,
                u.name as created_by_name,
                COUNT(ri.id) as item_count,
                COALESCE(SUM(ri.received_quantity), 0) as total_quantity
            FROM receipts r
            JOIN warehouses w ON r.warehouse_id = w.id
            JOIN locations l ON r.receiving_location_id = l.id
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
            WHERE ${whereSql}
            GROUP BY r.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `SELECT COUNT(*) as total FROM receipts r WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    getReceiptById(orgId, receiptId) {
        const receipt = db.getOne(`
            SELECT 
                r.id, r.receipt_number, r.supplier_name, r.status, r.expected_date,
                r.received_date, r.reference_number, r.notes, r.created_at, r.updated_at,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                l.id as location_id, l.name as location_name, l.code as location_code,
                u.name as created_by_name
            FROM receipts r
            JOIN warehouses w ON r.warehouse_id = w.id
            JOIN locations l ON r.receiving_location_id = l.id
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = ? AND r.organization_id = ?
        `, [receiptId, orgId]);

        if (!receipt) return null;

        const items = db.query(`
            SELECT 
                ri.id, ri.expected_quantity, ri.received_quantity, ri.notes,
                p.id as product_id, p.name as product_name, p.sku as product_sku,
                u.symbol as uom_symbol,
                COALESCE(b.quantity, 0) as current_location_stock
            FROM receipt_items ri
            JOIN products p ON ri.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.location_id = ?
            WHERE ri.receipt_id = ?
        `, [receipt.location_id, receiptId]);

        return {
            ...receipt,
            items
        };
    }

    createReceipt(orgId, data, userId) {
        const {
            supplier_name, warehouse_id, receiving_location_id,
            expected_date, reference_number, notes, items = []
        } = data;

        if (!warehouse_id || !receiving_location_id) {
            throw new Error('Warehouse and receiving location are required');
        }

        if (!items || items.length === 0) {
            throw new Error('Receipt must contain at least one item');
        }

        // Verify location belongs to warehouse
        const loc = db.getOne(`
            SELECT id FROM locations WHERE id = ? AND warehouse_id = ? AND is_active = 1
        `, [receiving_location_id, warehouse_id]);

        if (!loc) {
            throw new Error('Invalid receiving location for selected warehouse');
        }

        return db.transaction(() => {
            const receiptId = crypto.randomUUID();

            // Generate clean sequential receipt number
            const countRow = db.getOne(`SELECT COUNT(*) as count FROM receipts WHERE organization_id = ?`, [orgId]);
            const seq = String(countRow.count + 1).padStart(4, '0');
            const receiptNumber = `REC-${new Date().getFullYear()}-${seq}`;

            db.execute(`
                INSERT INTO receipts
                (id, organization_id, receipt_number, supplier_name, warehouse_id, receiving_location_id, expected_date, reference_number, notes, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
            `, [
                receiptId, orgId, receiptNumber, supplier_name || 'Generic Vendor',
                warehouse_id, receiving_location_id, expected_date || null,
                reference_number || '', notes || '', userId
            ]);

            for (const item of items) {
                if (!item.product_id || item.received_quantity === undefined || parseFloat(item.received_quantity) < 0) {
                    throw new Error('Valid product and non-negative received quantity are required for all line items');
                }

                db.execute(`
                    INSERT INTO receipt_items (id, receipt_id, product_id, expected_quantity, received_quantity, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), receiptId, item.product_id,
                    parseFloat(item.expected_quantity) || parseFloat(item.received_quantity),
                    parseFloat(item.received_quantity), item.notes || ''
                ]);
            }

            return this.getReceiptById(orgId, receiptId);
        });
    }

    updateReceiptStatus(orgId, receiptId, status, userId) {
        const receipt = this.getReceiptById(orgId, receiptId);
        if (!receipt) throw new Error('Receipt not found');
        if (receipt.status === 'DONE') throw new Error('Cannot modify a validated receipt');
        if (receipt.status === 'CANCELED') throw new Error('Cannot modify a canceled receipt');

        const allowed = ['DRAFT', 'WAITING', 'READY'];
        if (!allowed.includes(status)) {
            throw new Error(`Invalid status update to ${status}. Use validate endpoint to finalize.`);
        }

        db.execute(`UPDATE receipts SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, receiptId]);
        return this.getReceiptById(orgId, receiptId);
    }

    validateReceipt(orgId, receiptId, userId) {
        const receipt = this.getReceiptById(orgId, receiptId);
        if (!receipt) throw new Error('Receipt not found');
        if (receipt.status === 'DONE') throw new Error('Receipt is already validated');
        if (receipt.status === 'CANCELED') throw new Error('Cannot validate a canceled receipt');
        if (receipt.items.length === 0) throw new Error('Cannot validate a receipt with zero items');

        return db.transaction(() => {
            for (const item of receipt.items) {
                const qtyToAdd = parseFloat(item.received_quantity);
                if (qtyToAdd <= 0) {
                    throw new Error(`Item ${item.product_name} has invalid received quantity ${qtyToAdd}`);
                }

                // Check or create inventory balance
                let balance = db.getOne(`
                    SELECT id, quantity, reserved_quantity, version
                    FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, receipt.location_id]);

                let prevQty = 0;
                let newQty = qtyToAdd;

                if (balance) {
                    prevQty = balance.quantity;
                    newQty = prevQty + qtyToAdd;
                    db.execute(`
                        UPDATE inventory_balances
                        SET quantity = ?, version = version + 1, updated_at = datetime('now')
                        WHERE id = ?
                    `, [newQty, balance.id]);
                } else {
                    const balanceId = crypto.randomUUID();
                    db.execute(`
                        INSERT INTO inventory_balances
                        (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version)
                        VALUES (?, ?, ?, ?, ?, ?, 0.0, 1)
                    `, [balanceId, orgId, item.product_id, receipt.warehouse_id, receipt.location_id, newQty]);
                }

                // Insert immutable stock ledger entry
                const ledgerId = crypto.randomUUID();
                const idempotencyKey = `rec-${receipt.id}-${item.id}`;
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, 'RECEIPT', ?, 'RECEIPT', ?, ?, ?, ?, ?, ?)
                `, [
                    ledgerId, orgId, item.product_id, receipt.warehouse_id, receipt.location_id,
                    qtyToAdd, receipt.id, prevQty, newQty,
                    `Goods received under ${receipt.receipt_number} from ${receipt.supplier_name}`,
                    idempotencyKey, userId
                ]);
            }

            // Mark receipt as DONE
            db.execute(`
                UPDATE receipts 
                SET status = 'DONE', received_date = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            `, [receiptId]);

            // Add notification
            db.execute(`
                INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                VALUES (?, ?, ?, 'Receipt Validated', ?, 'RECEIPT_VALIDATED', 'receipt', ?)
            `, [
                crypto.randomUUID(), orgId, userId,
                `Receipt ${receipt.receipt_number} validated successfully. ${receipt.items.length} product(s) added to stock at ${receipt.warehouse_name}.`,
                receipt.id
            ]);

            return this.getReceiptById(orgId, receiptId);
        });
    }

    cancelReceipt(orgId, receiptId, userId) {
        const receipt = this.getReceiptById(orgId, receiptId);
        if (!receipt) throw new Error('Receipt not found');
        if (receipt.status === 'DONE') throw new Error('Cannot cancel a receipt that is already validated');
        if (receipt.status === 'CANCELED') throw new Error('Receipt is already canceled');

        db.execute(`UPDATE receipts SET status = 'CANCELED', updated_at = datetime('now') WHERE id = ?`, [receiptId]);
        return this.getReceiptById(orgId, receiptId);
    }
}

module.exports = new ReceiptsService();
