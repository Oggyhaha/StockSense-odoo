const db = require('../../database/connection');

class InventoryService {
    listBalances(orgId, query = {}) {
        const { warehouseId, locationId, categoryId, search, status, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['b.organization_id = ?'];
        let params = [orgId];

        if (warehouseId) {
            whereClauses.push('b.warehouse_id = ?');
            params.push(warehouseId);
        }

        if (locationId) {
            whereClauses.push('b.location_id = ?');
            params.push(locationId);
        }

        if (categoryId) {
            whereClauses.push('p.category_id = ?');
            params.push(categoryId);
        }

        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR w.name LIKE ? OR l.name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                b.id, b.quantity, b.reserved_quantity, (b.quantity - b.reserved_quantity) as available_quantity,
                b.version, b.updated_at,
                p.id as product_id, p.name as product_name, p.sku as product_sku, p.min_stock_level, p.unit_cost,
                (b.quantity * p.unit_cost) as total_valuation,
                u.symbol as uom_symbol,
                c.name as category_name,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                l.id as location_id, l.name as location_name, l.code as location_code, l.location_type
            FROM inventory_balances b
            JOIN products p ON b.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            JOIN categories c ON p.category_id = c.id
            JOIN warehouses w ON b.warehouse_id = w.id
            JOIN locations l ON b.location_id = l.id
            WHERE ${whereSql}
            ORDER BY p.name ASC, w.name ASC, l.name ASC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) as total
            FROM inventory_balances b
            JOIN products p ON b.product_id = p.id
            JOIN warehouses w ON b.warehouse_id = w.id
            JOIN locations l ON b.location_id = l.id
            WHERE ${whereSql}
        `;

        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    listLedger(orgId, query = {}) {
        const { productId, warehouseId, locationId, movementType, referenceType, search, page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['l.organization_id = ?'];
        let params = [orgId];

        if (productId) {
            whereClauses.push('l.product_id = ?');
            params.push(productId);
        }

        if (warehouseId) {
            whereClauses.push('l.warehouse_id = ?');
            params.push(warehouseId);
        }

        if (locationId) {
            whereClauses.push('(l.source_location_id = ? OR l.destination_location_id = ?)');
            params.push(locationId, locationId);
        }

        if (movementType) {
            whereClauses.push('l.movement_type = ?');
            params.push(movementType);
        }

        if (referenceType) {
            whereClauses.push('l.reference_type = ?');
            params.push(referenceType);
        }

        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR l.reason LIKE ? OR l.reference_id LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT 
                l.id, l.movement_type, l.quantity, l.reference_type, l.reference_id,
                l.previous_quantity, l.new_quantity, l.reason, l.idempotency_key, l.created_at,
                p.id as product_id, p.name as product_name, p.sku as product_sku,
                u.symbol as uom_symbol,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                sl.id as source_location_id, sl.name as source_location_name, sl.code as source_location_code,
                dl.id as destination_location_id, dl.name as destination_location_name, dl.code as destination_location_code,
                usr.name as performed_by_name
            FROM stock_ledger l
            JOIN products p ON l.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            JOIN warehouses w ON l.warehouse_id = w.id
            LEFT JOIN locations sl ON l.source_location_id = sl.id
            LEFT JOIN locations dl ON l.destination_location_id = dl.id
            LEFT JOIN users usr ON l.performed_by = usr.id
            WHERE ${whereSql}
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) as total
            FROM stock_ledger l
            JOIN products p ON l.product_id = p.id
            WHERE ${whereSql}
        `;

        const total = db.getOne(countSql, params).total;
        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }
}

module.exports = new InventoryService();
