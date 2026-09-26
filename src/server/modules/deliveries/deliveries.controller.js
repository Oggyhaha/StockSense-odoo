const express = require('express');
const deliveriesService = require('./deliveries.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List deliveries
router.get('/', requirePermission('delivery.view'), (req, res, next) => {
    try {
        const result = deliveriesService.listDeliveries(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// Get delivery detail
router.get('/:id', requirePermission('delivery.view'), (req, res, next) => {
    try {
        const delivery = deliveriesService.getDeliveryById(req.user.organization_id, req.params.id);
        if (!delivery) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Delivery order not found' });
        }
        res.json({ success: true, data: delivery });
    } catch (err) {
        next(err);
    }
});

// Create delivery
router.post('/', requirePermission('delivery.create'), (req, res, next) => {
    try {
        const delivery = deliveriesService.createDelivery(req.user.organization_id, req.body, req.user.id);
        recordAuditLog(req, 'DELIVERY_CREATED', 'delivery', delivery.id, `Created outgoing delivery ${delivery.delivery_number}`);
        res.status(201).json({ success: true, data: delivery });
    } catch (err) {
        next(err);
    }
});

// Update delivery status (Draft -> Waiting -> Ready)
router.patch('/:id/status', requirePermission('delivery.create'), (req, res, next) => {
    try {
        const delivery = deliveriesService.updateDeliveryStatus(req.user.organization_id, req.params.id, req.body.status, req.user.id);
        recordAuditLog(req, 'DELIVERY_STATUS_UPDATED', 'delivery', delivery.id, `Updated status of ${delivery.delivery_number} to ${delivery.status}`);
        res.json({ success: true, data: delivery });
    } catch (err) {
        next(err);
    }
});

// Validate delivery (Deducts stock & writes ledger) - from READY to DONE
router.post('/:id/validate', requirePermission('delivery.validate'), (req, res, next) => {
    try {
        const delivery = deliveriesService.validateDelivery(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'DELIVERY_VALIDATED', 'delivery', delivery.id, `Dispatched delivery order ${delivery.delivery_number}; stock decremented`);
        res.json({ success: true, data: delivery });
    } catch (err) {
        next(err);
    }
});

// Cancel delivery
router.post('/:id/cancel', requirePermission('delivery.cancel'), (req, res, next) => {
    try {
        const delivery = deliveriesService.cancelDelivery(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'DELIVERY_CANCELED', 'delivery', delivery.id, `Canceled delivery order ${delivery.delivery_number}`);
        res.json({ success: true, data: delivery });
    } catch (err) {
        next(err);
    }
});

module.exports = router;