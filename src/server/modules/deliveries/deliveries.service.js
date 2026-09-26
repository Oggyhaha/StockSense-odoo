const crypto = require('crypto');
const db = require('../../database/connection');

class DeliveriesService {
    listDeliveries(orgId, query = {}) {
        const { status, warehouseId, search, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['d.organization_id = ?'];
        let params = [orgId];

        if (status) {
            whereClauses.push('d.status = ?');
            params.push(status);
        }

        if (warehouseId) {
            whereClauses.push('d.warehouse_id = ?');
            params.push(warehouseId);
        }

        if (search) {
            whereClauses.push('(d.delivery_number LIKE ? OR d.customer_name LIKE ? OR d.reference_number LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                d.id, d.delivery_number, d.customer_name, d.status, d.scheduled_date,
                d.shipped_date, d.reference_number, d.notes, d.created_at,
                w.id as warehouse_id, w.name as warehouse_name,
                l.id as location_id, l.name as location_name,
                u.name as created_by_name,
                COUNT(di.id) as item_count,
                COALESCE(SUM(di.ordered_quantity), 0) as total_ordered_quantity,
                COALESCE(SUM(di.picked_quantity), 0) as total_picked_quantity
            FROM deliveries d
            JOIN warehouses w ON d.warehouse_id = w.id
            JOIN locations l ON d.source_location_id = l.id
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN delivery_items di ON d.id = di.delivery_id
            WHERE ${whereSql}
            GROUP BY d.id
            ORDER BY d.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `SELECT COUNT(*) as total FROM deliveries d WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    getDeliveryById(orgId, deliveryId) {
        const delivery = db.getOne(`
            SELECT 
                d.id, d.delivery_number, d.customer_name, d.status, d.scheduled_date,
                d.shipped_date, d.reference_number, d.notes, d.created_at, d.updated_at,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                l.id as location_id, l.name as location_name, l.code as location_code,
                u.name as created_by_name
            FROM deliveries d
            JOIN warehouses w ON d.warehouse_id = w.id
            JOIN locations l ON d.source_location_id = l.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.id = ? AND d.organization_id = ?
        `, [deliveryId, orgId]);

        if (!delivery) return null;

        const items = db.query(`
            SELECT 
                di.id, di.ordered_quantity, di.picked_quantity, di.packed_quantity,
                di.delivered_quantity, di.notes,
                p.id as product_id, p.name as product_name, p.sku as product_sku,
                u.symbol as uom_symbol,
                COALESCE(b.quantity, 0) as current_available_stock
            FROM delivery_items di
            JOIN products p ON di.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.location_id = ?
            WHERE di.delivery_id = ?
        `, [delivery.location_id, deliveryId]);

        return {
            ...delivery,
            items
        };
    }

    createDelivery(orgId, data, userId) {
        const {
            customer_name, warehouse_id, source_location_id,
            scheduled_date, reference_number, notes, items = []
        } = data;

        if (!warehouse_id || !source_location_id) {
            throw new Error('Warehouse and source dispatch location are required');
        }

        if (!items || items.length === 0) {
            throw new Error('Delivery order must contain at least one item');
        }

        const loc = db.getOne(`
            SELECT id FROM locations WHERE id = ? AND warehouse_id = ? AND is_active = 1
        `, [source_location_id, warehouse_id]);

        if (!loc) {
            throw new Error('Invalid source location for selected warehouse');
        }

        return db.transaction(() => {
            const deliveryId = crypto.randomUUID();

            const countRow = db.getOne(`SELECT COUNT(*) as count FROM deliveries WHERE organization_id = ?`, [orgId]);
            const seq = String(countRow.count + 1).padStart(4, '0');
            const deliveryNumber = `DEL-${new Date().getFullYear()}-${seq}`;

            db.execute(`
                INSERT INTO deliveries
                (id, organization_id, delivery_number, customer_name, warehouse_id, source_location_id, scheduled_date, reference_number, notes, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
            `, [
                deliveryId, orgId, deliveryNumber, customer_name || 'Customer Shipment',
                warehouse_id, source_location_id, scheduled_date || null,
                reference_number || '', notes || '', userId
            ]);

            for (const item of items) {
                const orderedQty = parseFloat(item.ordered_quantity);
                if (!item.product_id || isNaN(orderedQty) || orderedQty <= 0) {
                    throw new Error('Valid product and positive ordered quantity are required for all line items');
                }

                db.execute(`
                    INSERT INTO delivery_items 
                    (id, delivery_id, product_id, ordered_quantity, picked_quantity, packed_quantity, delivered_quantity, notes)
                    VALUES (?, ?, ?, ?, 0.0, 0.0, 0.0, ?)
                `, [crypto.randomUUID(), deliveryId, item.product_id, orderedQty, item.notes || '']);
            }

            return this.getDeliveryById(orgId, deliveryId);
        });
    }

    pickItems(orgId, deliveryId, pickData, userId) {
        const delivery = this.getDeliveryById(orgId, deliveryId);
        if (!delivery) throw new Error('Delivery not found');
        if (delivery.status === 'DONE') throw new Error('Cannot pick items for completed delivery');
        if (delivery.status === 'CANCELED') throw new Error('Cannot pick items for canceled delivery');

        return db.transaction(() => {
            // Update picked quantities
            if (Array.isArray(pickData)) {
                for (const p of pickData) {
                    db.execute(`
                        UPDATE delivery_items
                        SET picked_quantity = ?
                        WHERE id = ? AND delivery_id = ?
                    `, [parseFloat(p.picked_quantity) || 0, p.item_id, deliveryId]);
                }
            } else {
                // Auto mark all ordered items as picked
                db.execute(`
                    UPDATE delivery_items
                    SET picked_quantity = ordered_quantity
                    WHERE delivery_id = ?
                `, [deliveryId]);
            }

            db.execute(`UPDATE deliveries SET status = 'PICKING', updated_at = datetime('now') WHERE id = ?`, [deliveryId]);
            return this.getDeliveryById(orgId, deliveryId);
        });
    }

    packItems(orgId, deliveryId, packData, userId) {
        const delivery = this.getDeliveryById(orgId, deliveryId);
        if (!delivery) throw new Error('Delivery not found');
        if (delivery.status === 'DONE' || delivery.status === 'CANCELED') throw new Error('Invalid delivery status for packing');

        return db.transaction(() => {
            if (Array.isArray(packData)) {
                for (const p of packData) {
                    db.execute(`
                        UPDATE delivery_items
                        SET packed_quantity = ?
                        WHERE id = ? AND delivery_id = ?
                    `, [parseFloat(p.packed_quantity) || 0, p.item_id, deliveryId]);
                }
            } else {
                // Auto mark picked as packed
                db.execute(`
                    UPDATE delivery_items
                    SET packed_quantity = CASE WHEN picked_quantity > 0 THEN picked_quantity ELSE ordered_quantity END
                    WHERE delivery_id = ?
                `, [deliveryId]);
            }

            db.execute(`UPDATE deliveries SET status = 'PACKED', updated_at = datetime('now') WHERE id = ?`, [deliveryId]);
            return this.getDeliveryById(orgId, deliveryId);
        });
    }

    validateDelivery(orgId, deliveryId, userId) {
        const delivery = this.getDeliveryById(orgId, deliveryId);
        if (!delivery) throw new Error('Delivery not found');
        if (delivery.status === 'DONE') throw new Error('Delivery order is already validated');
        if (delivery.status === 'CANCELED') throw new Error('Cannot validate a canceled delivery');
        if (delivery.items.length === 0) throw new Error('Delivery has no items');

        // Check organization settings for negative stock policy
        const org = db.getOne(`SELECT allow_negative_stock FROM organizations WHERE id = ?`, [orgId]);
        const allowNegative = org ? !!org.allow_negative_stock : false;

        return db.transaction(() => {
            for (const item of delivery.items) {
                const qtyToDeduct = item.packed_quantity > 0 ? item.packed_quantity : (item.picked_quantity > 0 ? item.picked_quantity : item.ordered_quantity);

                // Fetch current stock at source location
                const balance = db.getOne(`
                    SELECT id, quantity, version
                    FROM inventory_balances
                    WHERE organization_id = ? AND product_id = ? AND location_id = ?
                `, [orgId, item.product_id, delivery.location_id]);

                const currentQty = balance ? balance.quantity : 0;

                if (!allowNegative && currentQty < qtyToDeduct) {
                    throw new Error(`Insufficient stock for '${item.product_name}' at location '${delivery.location_name}'. Available: ${currentQty}, Required: ${qtyToDeduct}`);
                }

                const prevQty = currentQty;
                const newQty = prevQty - qtyToDeduct;

                if (balance) {
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
                    `, [balanceId, orgId, item.product_id, delivery.warehouse_id, delivery.location_id, newQty]);
                }

                // Update item delivered_quantity
                db.execute(`UPDATE delivery_items SET delivered_quantity = ? WHERE id = ?`, [qtyToDeduct, item.id]);

                // Record immutable stock ledger entry
                const ledgerId = crypto.randomUUID();
                const idempotencyKey = `del-${delivery.id}-${item.id}`;
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, source_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, 'DELIVERY', ?, 'DELIVERY', ?, ?, ?, ?, ?, ?)
                `, [
                    ledgerId, orgId, item.product_id, delivery.warehouse_id, delivery.location_id,
                    -qtyToDeduct, delivery.id, prevQty, newQty,
                    `Customer dispatch under ${delivery.delivery_number} for ${delivery.customer_name}`,
                    idempotencyKey, userId
                ]);

                // Check low stock & out of stock alerts
                const prod = db.getOne(`
                    SELECT p.name, p.min_stock_level, COALESCE(SUM(b.quantity), 0) as total_org_stock
                    FROM products p
                    LEFT JOIN inventory_balances b ON p.id = b.product_id
                    WHERE p.id = ?
                    GROUP BY p.id
                `, [item.product_id]);

                if (prod) {
                    if (prod.total_org_stock <= 0) {
                        db.execute(`
                            INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                            VALUES (?, ?, ?, 'OUT OF STOCK ALERT', ?, 'OUT_OF_STOCK', 'product', ?)
                        `, [crypto.randomUUID(), orgId, userId, `Product '${prod.name}' is now completely out of stock across all locations!`, item.product_id]);
                    } else if (prod.total_org_stock <= prod.min_stock_level) {
                        db.execute(`
                            INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                            VALUES (?, ?, ?, 'Low Stock Alert', ?, 'LOW_STOCK', 'product', ?)
                        `, [crypto.randomUUID(), orgId, userId, `Product '${prod.name}' is running low (${prod.total_org_stock} remaining, minimum is ${prod.min_stock_level}).`, item.product_id]);
                    }
                }
            }

            // Mark delivery as DONE
            db.execute(`
                UPDATE deliveries 
                SET status = 'DONE', shipped_date = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            `, [deliveryId]);

            // Notification
            db.execute(`
                INSERT INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id)
                VALUES (?, ?, ?, 'Delivery Order Shipped', ?, 'DELIVERY_VALIDATED', 'delivery', ?)
            `, [
                crypto.randomUUID(), orgId, userId,
                `Delivery ${delivery.delivery_number} shipped successfully to ${delivery.customer_name}.`,
                delivery.id
            ]);

            return this.getDeliveryById(orgId, deliveryId);
        });
    }

    cancelDelivery(orgId, deliveryId, userId) {
        const delivery = this.getDeliveryById(orgId, deliveryId);
        if (!delivery) throw new Error('Delivery not found');
        if (delivery.status === 'DONE') throw new Error('Cannot cancel an already completed delivery order');
        if (delivery.status === 'CANCELED') throw new Error('Delivery order is already canceled');

        db.execute(`UPDATE deliveries SET status = 'CANCELED', updated_at = datetime('now') WHERE id = ?`, [deliveryId]);
        return this.getDeliveryById(orgId, deliveryId);
    }
}

module.exports = new DeliveriesService();
