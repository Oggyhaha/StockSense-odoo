const db = require('../../database/connection');

class DashboardService {
    getSummary(orgId, filters = {}) {
        const { warehouseId, categoryId } = filters;

        // Base filter conditions
        let whFilter = '';
        let prodCatFilter = '';
        const params = [orgId];

        if (warehouseId) {
            whFilter = 'AND b.warehouse_id = ?';
        }
        if (categoryId) {
            prodCatFilter = 'AND p.category_id = ?';
        }

        // Total stock quantity & products in stock
        const stockStats = db.getOne(`
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COALESCE(SUM(b.quantity), 0) as total_units,
                COALESCE(SUM(b.quantity * p.unit_cost), 0) as total_valuation
            FROM products p
            LEFT JOIN inventory_balances b ON p.id = b.product_id AND b.organization_id = ? ${whFilter ? 'AND b.warehouse_id = ?' : ''}
            WHERE p.organization_id = ? AND p.is_active = 1 ${categoryId ? 'AND p.category_id = ?' : ''}
        `, [
            orgId,
            ...(warehouseId ? [warehouseId] : []),
            orgId,
            ...(categoryId ? [categoryId] : [])
        ]);

        // Low stock and out of stock items
        const stockItems = db.query(`
            SELECT 
                p.id, p.min_stock_level,
                COALESCE(SUM(b.quantity), 0) as current_stock
            FROM products p
            LEFT JOIN inventory_balances b ON p.id = b.product_id AND b.organization_id = ? ${whFilter ? 'AND b.warehouse_id = ?' : ''}
            WHERE p.organization_id = ? AND p.is_active = 1 ${categoryId ? 'AND p.category_id = ?' : ''}
            GROUP BY p.id
        `, [
            orgId,
            ...(warehouseId ? [warehouseId] : []),
            orgId,
            ...(categoryId ? [categoryId] : [])
        ]);

        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (const item of stockItems) {
            if (item.current_stock <= 0) {
                outOfStockCount++;
            } else if (item.current_stock <= item.min_stock_level) {
                lowStockCount++;
            }
        }

        // Pending Receipts (DRAFT, WAITING, READY)
        const pendingReceipts = db.getOne(`
            SELECT COUNT(*) as count 
            FROM receipts 
            WHERE organization_id = ? AND status IN ('DRAFT', 'WAITING', 'READY')
            ${warehouseId ? 'AND warehouse_id = ?' : ''}
        `, [orgId, ...(warehouseId ? [warehouseId] : [])]).count;

        // Pending Deliveries (DRAFT, WAITING, READY, PICKING, PACKED)
        const pendingDeliveries = db.getOne(`
            SELECT COUNT(*) as count 
            FROM deliveries 
            WHERE organization_id = ? AND status IN ('DRAFT', 'WAITING', 'READY', 'PICKING', 'PACKED')
            ${warehouseId ? 'AND warehouse_id = ?' : ''}
        `, [orgId, ...(warehouseId ? [warehouseId] : [])]).count;

        // Scheduled Internal Transfers (DRAFT, WAITING, IN_TRANSIT)
        const pendingTransfers = db.getOne(`
            SELECT COUNT(*) as count 
            FROM internal_transfers 
            WHERE organization_id = ? AND status IN ('DRAFT', 'WAITING', 'IN_TRANSIT')
            ${warehouseId ? 'AND (source_warehouse_id = ? OR destination_warehouse_id = ?)' : ''}
        `, [orgId, ...(warehouseId ? [warehouseId, warehouseId] : [])]).count;

        // Stock Adjustments pending approval
        const pendingAdjustments = db.getOne(`
            SELECT COUNT(*) as count
            FROM stock_adjustments
            WHERE organization_id = ? AND status = 'PENDING_APPROVAL'
            ${warehouseId ? 'AND warehouse_id = ?' : ''}
        `, [orgId, ...(warehouseId ? [warehouseId] : [])]).count;

        return {
            totalProducts: stockStats.total_products || 0,
            totalStockQuantity: Math.round((stockStats.total_units || 0) * 100) / 100,
            totalStockValue: Math.round((stockStats.total_valuation || 0) * 100) / 100,
            lowStockCount,
            outOfStockCount,
            pendingReceipts,
            pendingDeliveries,
            pendingTransfers,
            pendingAdjustments
        };
    }

    getRecentActivity(orgId, limit = 15) {
        return db.query(`
            SELECT 
                l.id, l.movement_type, l.quantity, l.reference_type, l.reference_id,
                l.previous_quantity, l.new_quantity, l.reason, l.created_at,
                p.id as product_id, p.name as product_name, p.sku as product_sku,
                u.symbol as uom_symbol,
                w.name as warehouse_name,
                sl.name as source_location_name,
                dl.name as destination_location_name,
                usr.name as performed_by_name
            FROM stock_ledger l
            JOIN products p ON l.product_id = p.id
            JOIN units_of_measure u ON p.uom_id = u.id
            JOIN warehouses w ON l.warehouse_id = w.id
            LEFT JOIN locations sl ON l.source_location_id = sl.id
            LEFT JOIN locations dl ON l.destination_location_id = dl.id
            LEFT JOIN users usr ON l.performed_by = usr.id
            WHERE l.organization_id = ?
            ORDER BY l.created_at DESC
            LIMIT ?
        `, [orgId, limit]);
    }

    getWarehouseSummary(orgId) {
        const warehouses = db.query(`
            SELECT id, name, code, address, contact_person
            FROM warehouses
            WHERE organization_id = ? AND is_active = 1
        `, [orgId]);

        return warehouses.map(wh => {
            const stock = db.getOne(`
                SELECT 
                    COALESCE(SUM(quantity), 0) as total_qty,
                    COUNT(DISTINCT product_id) as active_sku_count
                FROM inventory_balances
                WHERE organization_id = ? AND warehouse_id = ?
            `, [orgId, wh.id]);

            const pendingOps = db.getOne(`
                SELECT 
                    (SELECT COUNT(*) FROM receipts WHERE warehouse_id = ? AND status != 'DONE' AND status != 'CANCELED') as receipts,
                    (SELECT COUNT(*) FROM deliveries WHERE warehouse_id = ? AND status != 'DONE' AND status != 'CANCELED') as deliveries,
                    (SELECT COUNT(*) FROM internal_transfers WHERE (source_warehouse_id = ? OR destination_warehouse_id = ?) AND status != 'DONE' AND status != 'CANCELED') as transfers
            `, [wh.id, wh.id, wh.id, wh.id]);

            return {
                ...wh,
                totalStockQuantity: stock.total_qty || 0,
                activeSkuCount: stock.active_sku_count || 0,
                pendingReceipts: pendingOps.receipts || 0,
                pendingDeliveries: pendingOps.deliveries || 0,
                pendingTransfers: pendingOps.transfers || 0
            };
        });
    }

    getChartsData(orgId) {
        // Top moving products by movement count in stock ledger
        const topProducts = db.query(`
            SELECT 
                p.name, p.sku,
                COUNT(l.id) as movement_count,
                COALESCE(SUM(ABS(l.quantity)), 0) as total_volume
            FROM stock_ledger l
            JOIN products p ON l.product_id = p.id
            WHERE l.organization_id = ?
            GROUP BY p.id
            ORDER BY movement_count DESC
            LIMIT 5
        `, [orgId]);

        // Monthly receipts vs deliveries comparison
        const receiptsCount = db.getOne(`SELECT COUNT(*) as count FROM receipts WHERE organization_id = ? AND status = 'DONE'`, [orgId]).count;
        const deliveriesCount = db.getOne(`SELECT COUNT(*) as count FROM deliveries WHERE organization_id = ? AND status = 'DONE'`, [orgId]).count;
        const transfersCount = db.getOne(`SELECT COUNT(*) as count FROM internal_transfers WHERE organization_id = ? AND status = 'DONE'`, [orgId]).count;
        const adjustmentsCount = db.getOne(`SELECT COUNT(*) as count FROM stock_adjustments WHERE organization_id = ? AND status = 'DONE'`, [orgId]).count;

        return {
            topProducts,
            operationBreakdown: {
                receipts: receiptsCount,
                deliveries: deliveriesCount,
                transfers: transfersCount,
                adjustments: adjustmentsCount
            }
        };
    }
}

module.exports = new DashboardService();
