const express = require('express');
const adjustmentsService = require('./adjustments.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List adjustments
router.get('/', requirePermission('adjustment.view'), (req, res, next) => {
    try {
        const result = adjustmentsService.listAdjustments(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// Get adjustment detail
router.get('/:id', requirePermission('adjustment.view'), (req, res, next) => {
    try {
        const adjustment = adjustmentsService.getAdjustmentById(req.user.organization_id, req.params.id);
        if (!adjustment) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Adjustment not found' });
        }
        res.json({ success: true, data: adjustment });
    } catch (err) {
        next(err);
    }
});

// Create adjustment
router.post('/', requirePermission('adjustment.create'), (req, res, next) => {
    try {
        const adjustment = adjustmentsService.createAdjustment(req.user.organization_id, req.body, req.user.id);
        recordAuditLog(req, 'ADJUSTMENT_CREATED', 'adjustment', adjustment.id, `Created stock adjustment ${adjustment.adjustment_number} (${adjustment.reason_category})`);
        res.status(201).json({ success: true, data: adjustment });
    } catch (err) {
        next(err);
    }
});

// Approve & execute adjustment
router.post('/:id/approve', requirePermission('adjustment.approve'), (req, res, next) => {
    try {
        const adjustment = adjustmentsService.approveAdjustment(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'ADJUSTMENT_APPROVED', 'adjustment', adjustment.id, `Approved and posted adjustment ${adjustment.adjustment_number}`);
        res.json({ success: true, data: adjustment });
    } catch (err) {
        next(err);
    }
});

// Reject adjustment
router.post('/:id/reject', requirePermission('adjustment.approve'), (req, res, next) => {
    try {
        const adjustment = adjustmentsService.rejectAdjustment(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'ADJUSTMENT_REJECTED', 'adjustment', adjustment.id, `Rejected adjustment ${adjustment.adjustment_number}`);
        res.json({ success: true, data: adjustment });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
