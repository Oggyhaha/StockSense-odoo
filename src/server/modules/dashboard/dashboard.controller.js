const express = require('express');
const dashboardService = require('./dashboard.service');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', (req, res, next) => {
    try {
        const { warehouseId, categoryId } = req.query;
        const summary = dashboardService.getSummary(req.user.organization_id, { warehouseId, categoryId });
        res.json({
            success: true,
            data: summary
        });
    } catch (err) {
        next(err);
    }
});

router.get('/activity', (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '15', 10);
        const activity = dashboardService.getRecentActivity(req.user.organization_id, limit);
        res.json({
            success: true,
            data: activity
        });
    } catch (err) {
        next(err);
    }
});

router.get('/warehouse-summary', (req, res, next) => {
    try {
        const summary = dashboardService.getWarehouseSummary(req.user.organization_id);
        res.json({
            success: true,
            data: summary
        });
    } catch (err) {
        next(err);
    }
});

router.get('/charts', (req, res, next) => {
    try {
        const charts = dashboardService.getChartsData(req.user.organization_id);
        res.json({
            success: true,
            data: charts
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
