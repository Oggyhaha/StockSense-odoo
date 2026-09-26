const express = require('express');
const inventoryService = require('./inventory.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

// Get current inventory balances across all locations
router.get('/balances', requirePermission('product.view'), (req, res, next) => {
    try {
        const result = inventoryService.listBalances(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// Get immutable stock ledger
router.get('/ledger', requirePermission('report.view'), (req, res, next) => {
    try {
        const result = inventoryService.listLedger(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
