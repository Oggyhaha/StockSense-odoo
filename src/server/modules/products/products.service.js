const crypto = require('crypto');
const db = require('../../database/connection');

class ProductsService {
    listProducts(orgId, query = {}) {
        const { search, categoryId, status, sort = 'name', order = 'ASC', page = 1, limit = 50 } = query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['p.organization_id = ?'];
        let params = [orgId];

        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        if (categoryId) {
            whereClauses.push('p.category_id = ?');
            params.push(categoryId);
        }

        if (status === 'active') {
            whereClauses.push('p.is_active = 1');
        } else if (status === 'inactive') {
            whereClauses.push('p.is_active = 0');
        }

        // Sorting mapping
        let orderByClause = 'p.name ASC';
        if (sort === 'sku') orderByClause = `p.sku ${order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
        if (sort === 'created_at') orderByClause = `p.created_at ${order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
        if (sort === 'stock') orderByClause = `current_stock ${order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;

        const whereSql = whereClauses.join(' AND ');

        // Query products with aggregated stock
        const sql = `
            SELECT 
                p.id, p.name, p.sku, p.barcode, p.description, p.min_stock_level,
                p.reorder_quantity, p.unit_cost, p.is_active, p.created_at,
                c.id as category_id, c.name as category_name,
                u.id as uom_id, u.name as uom_name, u.symbol as uom_symbol,
                COALESCE(SUM(b.quantity), 0) as current_stock,
                COALESCE(SUM(b.reserved_quantity), 0) as reserved_stock,
                (COALESCE(SUM(b.quantity), 0) - COALESCE(SUM(b.reserved_quantity), 0)) as available_stock
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN units_of_measure u ON p.uom_id = u.id
            LEFT JOIN inventory_balances b ON p.id = b.product_id AND b.organization_id = p.organization_id
            WHERE ${whereSql}
            GROUP BY p.id
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `;

        const countSql = `SELECT COUNT(*) as total FROM products p WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;

        const items = db.query(sql, [...params, parseInt(limit, 10), offset]);

        // Post-filter for stock status if requested (low_stock / out_of_stock)
        let filteredItems = items;
        if (status === 'low_stock') {
            filteredItems = items.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock_level);
        } else if (status === 'out_of_stock') {
            filteredItems = items.filter(i => i.current_stock <= 0);
        }

        return {
            items: filteredItems,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
    }

    getProductById(orgId, productId) {
        const product = db.getOne(`
            SELECT 
                p.id, p.name, p.sku, p.barcode, p.description, p.min_stock_level,
                p.reorder_quantity, p.unit_cost, p.is_active, p.created_at, p.updated_at,
                c.id as category_id, c.name as category_name,
                u.id as uom_id, u.name as uom_name, u.symbol as uom_symbol,
                COALESCE(SUM(b.quantity), 0) as total_stock,
                COALESCE(SUM(b.reserved_quantity), 0) as total_reserved,
                (COALESCE(SUM(b.quantity), 0) - COALESCE(SUM(b.reserved_quantity), 0)) as total_available
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN units_of_measure u ON p.uom_id = u.id
            LEFT JOIN inventory_balances b ON p.id = b.product_id
            WHERE p.id = ? AND p.organization_id = ?
            GROUP BY p.id
        `, [productId, orgId]);

        if (!product) return null;

        // Stock by location breakdown
        const stockByLocation = db.query(`
            SELECT 
                b.id as balance_id, b.quantity, b.reserved_quantity, (b.quantity - b.reserved_quantity) as available_quantity,
                w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
                l.id as location_id, l.name as location_name, l.code as location_code, l.location_type
            FROM inventory_balances b
            JOIN warehouses w ON b.warehouse_id = w.id
            JOIN locations l ON b.location_id = l.id
            WHERE b.product_id = ? AND b.organization_id = ?
            ORDER BY w.name ASC, l.name ASC
        `, [productId, orgId]);

        // Recent ledger entries for this product
        const recentLedger = db.query(`
            SELECT 
                l.id, l.movement_type, l.quantity, l.reference_type, l.reference_id,
                l.previous_quantity, l.new_quantity, l.reason, l.created_at,
                w.name as warehouse_name,
                sl.name as source_location_name,
                dl.name as destination_location_name,
                u.name as performed_by_name
            FROM stock_ledger l
            JOIN warehouses w ON l.warehouse_id = w.id
            LEFT JOIN locations sl ON l.source_location_id = sl.id
            LEFT JOIN locations dl ON l.destination_location_id = dl.id
            LEFT JOIN users u ON l.performed_by = u.id
            WHERE l.product_id = ? AND l.organization_id = ?
            ORDER BY l.created_at DESC
            LIMIT 10
        `, [productId, orgId]);

        return {
            ...product,
            stockByLocation,
            recentLedger
        };
    }

    createProduct(orgId, data, userId) {
        const {
            name, sku, barcode, category_id, uom_id, description,
            min_stock_level = 0, reorder_quantity = 0, unit_cost = 0,
            initial_stock = 0, initial_warehouse_id, initial_location_id
        } = data;

        // Validation
        if (!name || !sku || !category_id || !uom_id) {
            throw new Error('Product name, SKU, Category, and Unit of Measure are required');
        }

        const existingSku = db.getOne(`SELECT id FROM products WHERE organization_id = ? AND sku = ?`, [orgId, sku.trim()]);
        if (existingSku) {
            throw new Error(`SKU '${sku}' already exists in your organization`);
        }

        return db.transaction(() => {
            const productId = crypto.randomUUID();

            db.execute(`
                INSERT INTO products 
                (id, organization_id, name, sku, barcode, category_id, uom_id, description, min_stock_level, reorder_quantity, unit_cost, is_active, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [
                productId, orgId, name.trim(), sku.trim().toUpperCase(), barcode ? barcode.trim() : null,
                category_id, uom_id, description || '', parseFloat(min_stock_level) || 0,
                parseFloat(reorder_quantity) || 0, parseFloat(unit_cost) || 0, userId
            ]);

            // Handle optional initial stock
            const initStockQty = parseFloat(initial_stock) || 0;
            if (initStockQty > 0 && initial_warehouse_id && initial_location_id) {
                const balanceId = crypto.randomUUID();
                db.execute(`
                    INSERT INTO inventory_balances
                    (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version)
                    VALUES (?, ?, ?, ?, ?, ?, 0.0, 1)
                `, [balanceId, orgId, productId, initial_warehouse_id, initial_location_id, initStockQty]);

                const ledgerId = crypto.randomUUID();
                db.execute(`
                    INSERT INTO stock_ledger
                    (id, organization_id, product_id, warehouse_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                    VALUES (?, ?, ?, ?, ?, 'OPENING_BALANCE', ?, 'PRODUCT_CREATION', ?, 0.0, ?, 'Initial opening stock', ?, ?)
                `, [
                    ledgerId, orgId, productId, initial_warehouse_id, initial_location_id,
                    initStockQty, productId, initStockQty, `init-${productId}`, userId
                ]);
            }

            return this.getProductById(orgId, productId);
        });
    }

    updateProduct(orgId, productId, data) {
        const product = db.getOne(`SELECT id FROM products WHERE id = ? AND organization_id = ?`, [productId, orgId]);
        if (!product) {
            throw new Error('Product not found');
        }

        const {
            name, sku, barcode, category_id, uom_id, description,
            min_stock_level, reorder_quantity, unit_cost, is_active
        } = data;

        if (sku) {
            const existingSku = db.getOne(`SELECT id FROM products WHERE organization_id = ? AND sku = ? AND id != ?`, [orgId, sku.trim(), productId]);
            if (existingSku) {
                throw new Error(`SKU '${sku}' is already in use by another product`);
            }
        }

        db.execute(`
            UPDATE products SET
                name = COALESCE(?, name),
                sku = COALESCE(?, sku),
                barcode = COALESCE(?, barcode),
                category_id = COALESCE(?, category_id),
                uom_id = COALESCE(?, uom_id),
                description = COALESCE(?, description),
                min_stock_level = COALESCE(?, min_stock_level),
                reorder_quantity = COALESCE(?, reorder_quantity),
                unit_cost = COALESCE(?, unit_cost),
                is_active = COALESCE(?, is_active),
                updated_at = datetime('now')
            WHERE id = ? AND organization_id = ?
        `, [
            name ? name.trim() : null,
            sku ? sku.trim().toUpperCase() : null,
            barcode !== undefined ? barcode : null,
            category_id || null,
            uom_id || null,
            description !== undefined ? description : null,
            min_stock_level !== undefined ? parseFloat(min_stock_level) : null,
            reorder_quantity !== undefined ? parseFloat(reorder_quantity) : null,
            unit_cost !== undefined ? parseFloat(unit_cost) : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            productId, orgId
        ]);

        return this.getProductById(orgId, productId);
    }

    // Categories
    listCategories(orgId) {
        return db.query(`
            SELECT c.id, c.name, c.description, c.created_at, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
            WHERE c.organization_id = ?
            GROUP BY c.id
            ORDER BY c.name ASC
        `, [orgId]);
    }

    createCategory(orgId, name, description) {
        if (!name || !name.trim()) throw new Error('Category name is required');
        const id = crypto.randomUUID();
        db.execute(`INSERT INTO categories (id, organization_id, name, description) VALUES (?, ?, ?, ?)`,
            [id, orgId, name.trim(), description || '']);
        return db.getOne(`SELECT * FROM categories WHERE id = ?`, [id]);
    }

    // Units of Measure
    listUoms(orgId) {
        return db.query(`SELECT * FROM units_of_measure WHERE organization_id = ? ORDER BY is_default DESC, name ASC`, [orgId]);
    }

    createUom(orgId, name, symbol) {
        if (!name || !symbol) throw new Error('Name and symbol are required');
        const id = crypto.randomUUID();
        db.execute(`INSERT INTO units_of_measure (id, organization_id, name, symbol, is_default) VALUES (?, ?, ?, ?, 0)`,
            [id, orgId, name.trim(), symbol.trim()]);
        return db.getOne(`SELECT * FROM units_of_measure WHERE id = ?`, [id]);
    }
}

module.exports = new ProductsService();
