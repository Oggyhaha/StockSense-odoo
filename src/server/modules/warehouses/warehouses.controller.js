const express = require('express');
const warehousesService = require('./warehouses.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List warehouses
router.get('/', requirePermission('warehouse.view'), (req, res, next) => {
    try {
        const warehouses = warehousesService.listWarehouses(req.user.organization_id);
        res.json({ success: true, data: warehouses });
    } catch (err) {
        next(err);
    }
});

// List locations (can filter by ?warehouseId=...)
router.get('/locations', requirePermission('warehouse.view'), (req, res, next) => {
    try {
        const locations = warehousesService.listLocations(req.user.organization_id, req.query.warehouseId);
        res.json({ success: true, data: locations });
    } catch (err) {
        next(err);
    }
});

// Create location
router.post('/locations', requirePermission('warehouse.manage'), (req, res, next) => {
    try {
        const location = warehousesService.createLocation(req.user.organization_id, req.body);
        recordAuditLog(req, 'LOCATION_CREATED', 'location', location.id, `Created location ${location.name} (${location.code}) in warehouse ${location.warehouse_name}`);
        res.status(201).json({ success: true, data: location });
    } catch (err) {
        next(err);
    }
});

// Get warehouse detail
router.get('/:id', requirePermission('warehouse.view'), (req, res, next) => {
    try {
        const warehouse = warehousesService.getWarehouseById(req.user.organization_id, req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Warehouse not found' });
        }
        res.json({ success: true, data: warehouse });
    } catch (err) {
        next(err);
    }
});

// Create warehouse
router.post('/', requirePermission('warehouse.manage'), (req, res, next) => {
    try {
        const warehouse = warehousesService.createWarehouse(req.user.organization_id, req.body);
        recordAuditLog(req, 'WAREHOUSE_CREATED', 'warehouse', warehouse.id, `Created warehouse ${warehouse.name} (${warehouse.code})`);
        res.status(201).json({ success: true, data: warehouse });
    } catch (err) {
        next(err);
    }
});

// Update warehouse
router.patch('/:id', requirePermission('warehouse.manage'), (req, res, next) => {
    try {
        const warehouse = warehousesService.updateWarehouse(req.user.organization_id, req.params.id, req.body);
        recordAuditLog(req, 'WAREHOUSE_UPDATED', 'warehouse', warehouse.id, `Updated warehouse ${warehouse.name}`);
        res.json({ success: true, data: warehouse });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
