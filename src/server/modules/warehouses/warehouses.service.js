const crypto = require('crypto');
const db = require('../../database/connection');

class WarehousesService {
    listWarehouses(orgId) {
        const warehouses = db.query(`
            SELECT 
                w.id, w.name, w.code, w.address, w.contact_person, w.contact_number, w.is_active, w.created_at,
                COUNT(DISTINCT l.id) as location_count,
                COALESCE(SUM(b.quantity), 0) as total_stock
            FROM warehouses w
            LEFT JOIN locations l ON w.id = l.warehouse_id AND l.is_active = 1
            LEFT JOIN inventory_balances b ON w.id = b.warehouse_id
            WHERE w.organization_id = ?
            GROUP BY w.id
            ORDER BY w.name ASC
        `, [orgId]);

        return warehouses;
    }

    getWarehouseById(orgId, warehouseId) {
        const warehouse = db.getOne(`
            SELECT * FROM warehouses WHERE id = ? AND organization_id = ?
        `, [warehouseId, orgId]);

        if (!warehouse) return null;

        const locations = db.query(`
            SELECT 
                l.id, l.name, l.code, l.location_type, l.parent_location_id, l.is_active,
                pl.name as parent_location_name,
                COALESCE(SUM(b.quantity), 0) as current_stock,
                COUNT(DISTINCT b.product_id) as distinct_products
            FROM locations l
            LEFT JOIN locations pl ON l.parent_location_id = pl.id
            LEFT JOIN inventory_balances b ON l.id = b.location_id
            WHERE l.warehouse_id = ? AND l.organization_id = ?
            GROUP BY l.id
            ORDER BY l.name ASC
        `, [warehouseId, orgId]);

        return {
            ...warehouse,
            locations
        };
    }

    createWarehouse(orgId, data) {
        const { name, code, address, contact_person, contact_number } = data;
        if (!name || !code) throw new Error('Warehouse name and code are required');

        const existing = db.getOne(`SELECT id FROM warehouses WHERE organization_id = ? AND code = ?`, [orgId, code.trim()]);
        if (existing) throw new Error(`Warehouse code '${code}' already exists`);

        const id = crypto.randomUUID();
        db.execute(`
            INSERT INTO warehouses (id, organization_id, name, code, address, contact_person, contact_number, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [id, orgId, name.trim(), code.trim().toUpperCase(), address || '', contact_person || '', contact_number || '']);

        // Automatically create standard default locations: Receiving, Storage, Dispatch
        db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'Inbound Receiving', 'REC-01', 'RECEIVING')`, [crypto.randomUUID(), orgId, id]);
        db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'Main Storage Aisle', 'STG-01', 'STORAGE')`, [crypto.randomUUID(), orgId, id]);
        db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'Outbound Dispatch', 'DSP-01', 'DISPATCH')`, [crypto.randomUUID(), orgId, id]);

        return this.getWarehouseById(orgId, id);
    }

    updateWarehouse(orgId, warehouseId, data) {
        const { name, code, address, contact_person, contact_number, is_active } = data;
        
        db.execute(`
            UPDATE warehouses SET
                name = COALESCE(?, name),
                code = COALESCE(?, code),
                address = COALESCE(?, address),
                contact_person = COALESCE(?, contact_person),
                contact_number = COALESCE(?, contact_number),
                is_active = COALESCE(?, is_active),
                updated_at = datetime('now')
            WHERE id = ? AND organization_id = ?
        `, [
            name ? name.trim() : null,
            code ? code.trim().toUpperCase() : null,
            address !== undefined ? address : null,
            contact_person !== undefined ? contact_person : null,
            contact_number !== undefined ? contact_number : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            warehouseId, orgId
        ]);

        return this.getWarehouseById(orgId, warehouseId);
    }

    // Locations
    listLocations(orgId, warehouseId = null) {
        let sql = `
            SELECT 
                l.id, l.warehouse_id, l.name, l.code, l.location_type, l.parent_location_id, l.is_active,
                w.name as warehouse_name, w.code as warehouse_code,
                pl.name as parent_location_name,
                COALESCE(SUM(b.quantity), 0) as current_stock
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.id
            LEFT JOIN locations pl ON l.parent_location_id = pl.id
            LEFT JOIN inventory_balances b ON l.id = b.location_id
            WHERE l.organization_id = ?
        `;
        const params = [orgId];

        if (warehouseId) {
            sql += ` AND l.warehouse_id = ?`;
            params.push(warehouseId);
        }

        sql += ` GROUP BY l.id ORDER BY w.name ASC, l.name ASC`;
        return db.query(sql, params);
    }

    createLocation(orgId, data) {
        const { warehouse_id, parent_location_id, name, code, location_type } = data;
        if (!warehouse_id || !name || !code || !location_type) {
            throw new Error('Warehouse, location name, code, and location type are required');
        }

        const validTypes = ['INTERNAL', 'RECEIVING', 'STORAGE', 'PRODUCTION', 'DISPATCH', 'SCRAP', 'VIRTUAL'];
        if (!validTypes.includes(location_type)) {
            throw new Error(`Invalid location type. Must be one of [${validTypes.join(', ')}]`);
        }

        const existing = db.getOne(`SELECT id FROM locations WHERE warehouse_id = ? AND code = ?`, [warehouse_id, code.trim()]);
        if (existing) {
            throw new Error(`Location code '${code}' already exists in this warehouse`);
        }

        const id = crypto.randomUUID();
        db.execute(`
            INSERT INTO locations (id, organization_id, warehouse_id, parent_location_id, name, code, location_type, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [id, orgId, warehouse_id, parent_location_id || null, name.trim(), code.trim().toUpperCase(), location_type]);

        return db.getOne(`
            SELECT l.*, w.name as warehouse_name 
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.id
            WHERE l.id = ?
        `, [id]);
    }
}

module.exports = new WarehousesService();
