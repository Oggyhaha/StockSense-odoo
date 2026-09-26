const crypto = require('crypto');
const db = require('../../database/connection');

class AdjustmentsService {
    listAdjustments(orgId, query = {}) {
        const { status, warehouseId, search, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['a.organization_id = ?'];
        let params = [orgId];

        if (status) {
            whereClauses.push('a.status = ?');
            params.push(status);
        }

        if (warehouseId) {
            whereClauses.push('a.warehouse_id = ?');
            params.push(warehouseId);
        }

        if (search) {
            whereClauses.push('(a.adjustment_number LIKE ? OR a.detailed_reason LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                a.id, a.adjustment_number, a.adjustment_date, a.reason_category,
                a.detailed_reason, a.status, a.created_at,
                w.id as warehouse_id, w.name as warehouse_name,
                l.id as location_id, l.name as location_name,
                u.name as created_by_name,
                COUNT(ai.id) as item_count,
                COALESCE(SUM(ai.difference), 0) as net_difference
            FROM stock_adjustments a
            JOIN warehouses w ON a.warehouse_id = w.id
            JOIN locations l ON a.location_id = l.id
            LEFT JOIN users u ON a.created_by = u.id
            LEFT JOIN stock_adjustment_items ai ON a.id = ai.adjustment_id
            WHERE ${whereSql}
            GROUP BY a.id
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `SELECT COUNT(*) as total FROM stock_adjustments a WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    getAdjustmentById(orgId, adjustmentId) {
        const adjustment = db.getOne(`
            SELECT 
                a.id, a.adjustment_number, a.adjustment_date, a.reason_category,
                a.detailed_reason, a.status, a.created_at, a.updated_at,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                l.id as location_id, l.name as location_name, l.code as location_code,
                u.name as created_by_name
            FROM stock_adjustments a
            JOIN warehouses w ON a.warehouse_id = w.id
            JOIN locations l ON a.location_id = l.id
            LEFT JOIN users u ON a.created_by = u.id
            WHERE a.id = ? AND a.organization_id = ?
        `, [adjustmentId, orgId]);

        if (!adjustment) return null;

        const items = db.query(`
            SELECT 
                ai.id, ai.system_quantity, ai.counted_quantity, ai.difference, ai.notes,
                p.id as product_id, p.name as product_name, p.sku as product_sku, p.unit_cost,
                u.symbol as uom_symbol
            FROM stock_adjustment_items ai
            JOIN products p ON ai.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            WHERE ai.adjustment_id = ?
        `, [adjustmentId]);

        return {
            ...adjustment,
            items
        };
    }

    createAdjustment(orgId, data, userId) {
        const {
            warehouse_id, location_id, reason_category, detailed_reason, items = []
        } = data;

        if (!warehouse_id || !location_id || !reason_category) {
            throw new Error('Warehouse, location, and reason category are required');
        }

        const validReasons = ['DAMAGED', 'LOST', 'FOUND', 'COUNTING_ERROR', 'OPENING_BALANCE', 'OTHER'];
        if (!validReasons.includes(reason_category)) {
            throw new Error(`Reason category must be one of [${validReasons.join(', ')}]`);
        }

        if (!items || items.length === 0) {
            throw new Error('Adjustment must contain at least one product count');
        }

        // Fetch organization approval threshold
        const org = db.getOne(`SELECT adjustment_approval_threshold FROM organizations WHERE id = ?`, [orgId]);
        const threshold = org ? org.adjustment_approval_threshold : 500.0;

        return db.transaction(() => {
            const adjustmentId = crypto.randomUUID();

            const countRow = db.getOne(`SELECT COUNT(*) as count FROM stock_adjustments WHERE organization_id = ?`, [orgId]);
            const seq = String(countRow.count + 1).padStart(4, '0');
            const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${seq}`;

            let totalValuationImpact = 0;
            const parsedItems = [];

            for (const item of items) {
                if (!item.product_id || item.counted_quantity === undefined) {
                    throw new Error('Product and counted quantity are required for each line');
                }

                const counted = parseFloat(item.counted_quantity);
                if (counted < 0) throw new Error('Counted quantity cannot be negative');

                // Take real-time snapshot of system quantity at this location
                const currentBalance = db.getOne(`
                    SELECT quantity FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, location_id]);

                const systemQty = currentBalance ? currentBalance.quantity : 0;
                const difference = counted - systemQty;

                const prod = db.getOne(`SELECT unit_cost FROM products WHERE id = ?`, [item.product_id]);
                const unitCost = prod ? prod.unit_cost : 0;
                totalValuationImpact += Math.abs(difference * unitCost);

                parsedItems.push({
                    productId: item.product_id,
                    systemQty,
                    countedQty: counted,
                    difference,
                    notes: item.notes || ''
                });
            }

            // If impact exceeds threshold, requires manager/admin approval
            const initialStatus = totalValuationImpact > threshold ? 'PENDING_APPROVAL' : 'DRAFT';

            db.execute(`
                INSERT INTO stock_adjustments
                (id, organization_id, adjustment_number, warehouse_id, location_id, adjustment_date, reason_category, detailed_reason, status, created_by)
                VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
            `, [
                adjustmentId, orgId, adjustmentNumber, warehouse_id, location_id,
                reason_category, detailed_reason || '', initialStatus, userId
            ]);

            for (const item of parsedItems) {
                db.execute(`
                    INSERT INTO stock_adjustment_items
                    (id, adjustment_id, product_id, system_quantity, counted_quantity, difference, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), adjustmentId, item.productId,
                    item.systemQty, item.countedQty, item.difference, item.notes
                ]);
            }

            if (initialStatus === 'PENDING_APPROVAL') {
                db.execute(`
                    INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                    VALUES (?, ?, NULL, 'Adjustment Approval Required', ?, 'ADJUSTMENT_PENDING', 'adjustment', ?)
                `, [
                    crypto.randomUUID(), orgId,
                    `Stock Adjustment ${adjustmentNumber} involves a total value variance of $${totalValuationImpact.toFixed(2)} (exceeds $${threshold} threshold) and requires approval.`,
                    adjustmentId
                ]);
            }

            return this.getAdjustmentById(orgId, adjustmentId);
        });
    }

    approveAdjustment(orgId, adjustmentId, userId) {
        const adj = this.getAdjustmentById(orgId, adjustmentId);
        if (!adj) throw new Error('Stock adjustment not found');
        if (adj.status === 'DONE') throw new Error('Stock adjustment is already executed');
        if (adj.status === 'REJECTED' || adj.status === 'CANCELED') throw new Error('Cannot execute a rejected or canceled adjustment');

        return db.transaction(() => {
            for (const item of adj.items) {
                // Fetch existing balance
                let balance = db.getOne(`
                    SELECT id, quantity, version
                    FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, adj.location_id]);

                const prevQty = balance ? balance.quantity : 0;
                const newQty = item.counted_quantity;
                const diff = newQty - prevQty;

                if (balance) {
                    db.execute(`
                        UPDATE inventory_balances
                        SET quantity = ?, version = version + 1, updated_at = datetime('now')
                        WHERE id = ?
                    `, [newQty, balance.id]);
                } else {
                    db.execute(`
                        INSERT INTO inventory_balances
                        (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version)
                        VALUES (?, ?, ?, ?, ?, ?, 0.0, 1)
                    `, [crypto.randomUUID(), orgId, item.product_id, adj.warehouse_id, adj.location_id, newQty]);
                }

                // Append-only stock ledger entry
                const idempotencyKey = `adj-${adj.id}-${item.id}`;
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, source_location_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, ?, 'ADJUSTMENT', ?, 'STOCK_ADJUSTMENT', ?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), orgId, item.product_id, adj.warehouse_id,
                    diff < 0 ? adj.location_id : null,
                    diff > 0 ? adj.location_id : null,
                    diff, adj.id, prevQty, newQty,
                    `[${adj.reason_category}] ${adj.detailed_reason || 'Physical cycle count adjustment'}`,
                    idempotencyKey, userId
                ]);
            }

            db.execute(`
                UPDATE stock_adjustments
                SET status = 'DONE', updated_at = datetime('now')
                WHERE id = ?
            `, [adjustmentId]);

            db.execute(`
                INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                VALUES (?, ?, ?, 'Stock Adjustment Applied', ?, 'SYSTEM', 'adjustment', ?)
            `, [
                crypto.randomUUID(), orgId, userId,
                `Adjustment ${adj.adjustment_number} has been applied to stock balances at ${adj.location_name}.`,
                adj.id
            ]);

            return this.getAdjustmentById(orgId, adjustmentId);
        });
    }

    rejectAdjustment(orgId, adjustmentId, userId) {
        const adj = this.getAdjustmentById(orgId, adjustmentId);
        if (!adj) throw new Error('Stock adjustment not found');
        if (adj.status === 'DONE') throw new Error('Cannot reject an adjustment that has already been executed');

        db.execute(`UPDATE stock_adjustments SET status = 'REJECTED', updated_at = datetime('now') WHERE id = ?`, [adjustmentId]);
        return this.getAdjustmentById(orgId, adjustmentId);
    }
}

module.exports = new AdjustmentsService();
