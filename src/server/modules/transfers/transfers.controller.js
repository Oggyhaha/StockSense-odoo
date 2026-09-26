const express = require('express');
const transfersService = require('./transfers.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List transfers
router.get('/', requirePermission('transfer.view'), (req, res, next) => {
    try {
        const result = transfersService.listTransfers(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// Get transfer detail
router.get('/:id', requirePermission('transfer.view'), (req, res, next) => {
    try {
        const transfer = transfersService.getTransferById(req.user.organization_id, req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Internal transfer not found' });
        }
        res.json({ success: true, data: transfer });
    } catch (err) {
        next(err);
    }
});

// Create transfer
router.post('/', requirePermission('transfer.create'), (req, res, next) => {
    try {
        const transfer = transfersService.createTransfer(req.user.organization_id, req.body, req.user.id);
        recordAuditLog(req, 'TRANSFER_CREATED', 'transfer', transfer.id, `Created transfer ${transfer.transfer_number} from ${transfer.source_warehouse_name} to ${transfer.destination_warehouse_name}`);
        res.status(201).json({ success: true, data: transfer });
    } catch (err) {
        next(err);
    }
});

// Update status (e.g. DRAFT -> IN_TRANSIT)
router.patch('/:id/status', requirePermission('transfer.create'), (req, res, next) => {
    try {
        const transfer = transfersService.updateTransferStatus(req.user.organization_id, req.params.id, req.body.status, req.user.id);
        recordAuditLog(req, 'TRANSFER_STATUS_UPDATED', 'transfer', transfer.id, `Transfer ${transfer.transfer_number} set to ${transfer.status}`);
        res.json({ success: true, data: transfer });
    } catch (err) {
        next(err);
    }
});

// Validate transfer (Relocates stock + logs 2 ledger records per item)
router.post('/:id/validate', requirePermission('transfer.validate'), (req, res, next) => {
    try {
        const transfer = transfersService.validateTransfer(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'TRANSFER_VALIDATED', 'transfer', transfer.id, `Completed transfer ${transfer.transfer_number}`);
        res.json({ success: true, data: transfer });
    } catch (err) {
        next(err);
    }
});

// Cancel transfer
router.post('/:id/cancel', requirePermission('transfer.create'), (req, res, next) => {
    try {
        const transfer = transfersService.cancelTransfer(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'TRANSFER_CANCELED', 'transfer', transfer.id, `Canceled transfer ${transfer.transfer_number}`);
        res.json({ success: true, data: transfer });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
