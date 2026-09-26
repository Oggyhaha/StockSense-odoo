const crypto = require('crypto');
const db = require('../../database/connection');

class TransfersService {
    listTransfers(orgId, query = {}) {
        const { status, warehouseId, search, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['t.organization_id = ?'];
        let params = [orgId];

        if (status) {
            whereClauses.push('t.status = ?');
            params.push(status);
        }

        if (warehouseId) {
            whereClauses.push('(t.source_warehouse_id = ? OR t.destination_warehouse_id = ?)');
            params.push(warehouseId, warehouseId);
        }

        if (search) {
            whereClauses.push('(t.transfer_number LIKE ? OR t.reason LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                t.id, t.transfer_number, t.status, t.scheduled_date, t.completed_date,
                t.reason, t.created_at,
                sw.id as source_warehouse_id, sw.name as source_warehouse_name,
                sl.id as source_location_id, sl.name as source_location_name,
                dw.id as destination_warehouse_id, dw.name as destination_warehouse_name,
                dl.id as destination_location_id, dl.name as destination_location_name,
                u.name as created_by_name,
                COUNT(ti.id) as item_count,
                COALESCE(SUM(ti.quantity), 0) as total_quantity
            FROM internal_transfers t
            JOIN warehouses sw ON t.source_warehouse_id = sw.id
            JOIN locations sl ON t.source_location_id = sl.id
            JOIN warehouses dw ON t.destination_warehouse_id = dw.id
            JOIN locations dl ON t.destination_location_id = dl.id
            LEFT JOIN users u ON t.created_by = u.id
            LEFT JOIN internal_transfer_items ti ON t.id = ti.transfer_id
            WHERE ${whereSql}
            GROUP BY t.id
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `SELECT COUNT(*) as total FROM internal_transfers t WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    getTransferById(orgId, transferId) {
        const transfer = db.getOne(`
            SELECT 
                t.id, t.transfer_number, t.status, t.scheduled_date, t.completed_date,
                t.reason, t.created_at, t.updated_at,
                sw.id as source_warehouse_id, sw.name as source_warehouse_name, sw.code as source_warehouse_code,
                sl.id as source_location_id, sl.name as source_location_name, sl.code as source_location_code,
                dw.id as destination_warehouse_id, dw.name as destination_warehouse_name, dw.code as destination_warehouse_code,
                dl.id as destination_location_id, dl.name as destination_location_name, dl.code as destination_location_code,
                u.name as created_by_name
            FROM internal_transfers t
            JOIN warehouses sw ON t.source_warehouse_id = sw.id
            JOIN locations sl ON t.source_location_id = sl.id
            JOIN warehouses dw ON t.destination_warehouse_id = dw.id
            JOIN locations dl ON t.destination_location_id = dl.id
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.id = ? AND t.organization_id = ?
        `, [transferId, orgId]);

        if (!transfer) return null;

        const items = db.query(`
            SELECT 
                ti.id, ti.quantity, ti.notes,
                p.id as product_id, p.name as product_name, p.sku as product_sku,
                u.symbol as uom_symbol,
                COALESCE(sb.quantity, 0) as source_available_stock,
                COALESCE(db.quantity, 0) as dest_current_stock
            FROM internal_transfer_items ti
            JOIN products p ON ti.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            LEFT JOIN inventory_balances sb ON sb.product_id = p.id AND sb.location_id = ?
            LEFT JOIN inventory_balances db ON db.product_id = p.id AND db.location_id = ?
            WHERE ti.transfer_id = ?
        `, [transfer.source_location_id, transfer.destination_location_id, transferId]);

        return {
            ...transfer,
            items
        };
    }

    createTransfer(orgId, data, userId) {
        const {
            source_warehouse_id, source_location_id,
            destination_warehouse_id, destination_location_id,
            scheduled_date, reason, items = []
        } = data;

        if (!source_warehouse_id || !source_location_id || !destination_warehouse_id || !destination_location_id) {
            throw new Error('Source warehouse/location and destination warehouse/location are all required');
        }

        if (source_location_id === destination_location_id) {
            throw new Error('Source location and destination location must be different');
        }

        if (!items || items.length === 0) {
            throw new Error('Transfer must include at least one item');
        }

        return db.transaction(() => {
            const transferId = crypto.randomUUID();

            const countRow = db.getOne(`SELECT COUNT(*) as count FROM internal_transfers WHERE organization_id = ?`, [orgId]);
            const seq = String(countRow.count + 1).padStart(4, '0');
            const transferNumber = `TRF-${new Date().getFullYear()}-${seq}`;

            db.execute(`
                INSERT INTO internal_transfers
                (id, organization_id, transfer_number, source_warehouse_id, source_location_id, destination_warehouse_id, destination_location_id, scheduled_date, reason, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
            `, [
                transferId, orgId, transferNumber,
                source_warehouse_id, source_location_id,
                destination_warehouse_id, destination_location_id,
                scheduled_date || null, reason || '', userId
            ]);

            for (const item of items) {
                const qty = parseFloat(item.quantity);
                if (!item.product_id || isNaN(qty) || qty <= 0) {
                    throw new Error('Valid product and positive transfer quantity are required');
                }

                db.execute(`
                    INSERT INTO internal_transfer_items (id, transfer_id, product_id, quantity, notes)
                    VALUES (?, ?, ?, ?, ?)
                `, [crypto.randomUUID(), transferId, item.product_id, qty, item.notes || '']);
            }

            return this.getTransferById(orgId, transferId);
        });
    }

    updateTransferStatus(orgId, transferId, status, userId) {
        const transfer = this.getTransferById(orgId, transferId);
        if (!transfer) throw new Error('Transfer not found');
        if (transfer.status === 'DONE') throw new Error('Transfer is already completed');
        if (transfer.status === 'CANCELED') throw new Error('Transfer is canceled');

        const allowed = ['DRAFT', 'WAITING', 'IN_TRANSIT'];
        if (!allowed.includes(status)) {
            throw new Error(`Invalid status ${status}. Use validate to complete transfer.`);
        }

        db.execute(`UPDATE internal_transfers SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, transferId]);
        return this.getTransferById(orgId, transferId);
    }

    validateTransfer(orgId, transferId, userId) {
        const transfer = this.getTransferById(orgId, transferId);
        if (!transfer) throw new Error('Transfer not found');
        if (transfer.status === 'DONE') throw new Error('Transfer is already completed');
        if (transfer.status === 'CANCELED') throw new Error('Cannot complete a canceled transfer');
        if (transfer.items.length === 0) throw new Error('Cannot complete transfer with no items');

        const org = db.getOne(`SELECT allow_negative_stock FROM organizations WHERE id = ?`, [orgId]);
        const allowNegative = org ? !!org.allow_negative_stock : false;

        return db.transaction(() => {
            for (const item of transfer.items) {
                const qty = parseFloat(item.quantity);

                // Check source stock
                const srcBalance = db.getOne(`
                    SELECT id, quantity FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, transfer.source_location_id]);

                const srcCurrent = srcBalance ? srcBalance.quantity : 0;
                if (!allowNegative && srcCurrent < qty) {
                    throw new Error(`Insufficient stock for '${item.product_name}' at source location '${transfer.source_location_name}'. Available: ${srcCurrent}, Needed: ${qty}`);
                }

                // 1. Decrement Source Balance
                const srcNew = srcCurrent - qty;
                if (srcBalance) {
                    db.execute(`UPDATE inventory_balances SET quantity = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?`, [srcNew, srcBalance.id]);
                } else {
                    db.execute(`
                        INSERT INTO inventory_balances (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version)
                        VALUES (?, ?, ?, ?, ?, ?, 0.0, 1)
                    `, [crypto.randomUUID(), orgId, item.product_id, transfer.source_warehouse_id, transfer.source_location_id, srcNew]);
                }

                // 2. Increment Destination Balance
                const dstBalance = db.getOne(`
                    SELECT id, quantity FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, transfer.destination_location_id]);

                const dstCurrent = dstBalance ? dstBalance.quantity : 0;
                const dstNew = dstCurrent + qty;

                if (dstBalance) {
                    db.execute(`UPDATE inventory_balances SET quantity = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?`, [dstNew, dstBalance.id]);
                } else {
                    db.execute(`
                        INSERT INTO inventory_balances (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version)
                        VALUES (?, ?, ?, ?, ?, ?, 0.0, 1)
                    `, [crypto.randomUUID(), orgId, item.product_id, transfer.destination_warehouse_id, transfer.destination_location_id, dstNew]);
                }

                // 3. Insert Outgoing Ledger Entry (source side)
                const idempotencyKeyOut = `trf-${transfer.id}-${item.id}-out`;
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, source_location_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, ?, 'INTERNAL_TRANSFER', ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), orgId, item.product_id, transfer.source_warehouse_id,
                    transfer.source_location_id, transfer.destination_location_id,
                    -qty, transfer.id, srcCurrent, srcNew,
                    `Transfer ${transfer.transfer_number} to ${transfer.destination_warehouse_name} (${transfer.destination_location_name})`,
                    idempotencyKeyOut, userId
                ]);

                // 4. Insert Incoming Ledger Entry (destination side)
                const idempotencyKeyIn = `trf-${transfer.id}-${item.id}-in`;
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, source_location_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, ?, 'INTERNAL_TRANSFER', ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), orgId, item.product_id, transfer.destination_warehouse_id,
                    transfer.source_location_id, transfer.destination_location_id,
                    qty, transfer.id, dstCurrent, dstNew,
                    `Transfer ${transfer.transfer_number} received from ${transfer.source_warehouse_name} (${transfer.source_location_name})`,
                    idempotencyKeyIn, userId
                ]);
            }

            // Mark transfer as DONE
            db.execute(`
                UPDATE internal_transfers 
                SET status = 'DONE', completed_date = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            `, [transferId]);

            // Notification
            db.execute(`
                INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                VALUES (?, ?, ?, 'Internal Transfer Completed', ?, 'TRANSFER_COMPLETED', 'transfer', ?)
            `, [
                crypto.randomUUID(), orgId, userId,
                `Internal Transfer ${transfer.transfer_number} completed: ${transfer.items.length} product(s) relocated to ${transfer.destination_location_name}.`,
                transfer.id
            ]);

            return this.getTransferById(orgId, transferId);
        });
    }

    cancelTransfer(orgId, transferId, userId) {
        const transfer = this.getTransferById(orgId, transferId);
        if (!transfer) throw new Error('Transfer not found');
        if (transfer.status === 'DONE') throw new Error('Cannot cancel a completed internal transfer');
        if (transfer.status === 'CANCELED') throw new Error('Transfer is already canceled');

        db.execute(`UPDATE internal_transfers SET status = 'CANCELED', updated_at = datetime('now') WHERE id = ?`, [transferId]);
        return this.getTransferById(orgId, transferId);
    }
}

module.exports = new TransfersService();
