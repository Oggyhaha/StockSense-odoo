const express = require('express');
const receiptsService = require('./receipts.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List receipts
router.get('/', requirePermission('receipt.view'), (req, res, next) => {
    try {
        const result = receiptsService.listReceipts(req.user.organization_id, req.query);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// Get receipt detail
router.get('/:id', requirePermission('receipt.view'), (req, res, next) => {
    try {
        const receipt = receiptsService.getReceiptById(req.user.organization_id, req.params.id);
        if (!receipt) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Receipt not found' });
        }
        res.json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
});

// Create receipt
router.post('/', requirePermission('receipt.create'), (req, res, next) => {
    try {
        const receipt = receiptsService.createReceipt(req.user.organization_id, req.body, req.user.id);
        recordAuditLog(req, 'RECEIPT_CREATED', 'receipt', receipt.id, `Created incoming receipt ${receipt.receipt_number}`);
        res.status(201).json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
});

// Update receipt status (Draft -> Waiting -> Ready)
router.patch('/:id/status', requirePermission('receipt.create'), (req, res, next) => {
    try {
        const receipt = receiptsService.updateReceiptStatus(req.user.organization_id, req.params.id, req.body.status, req.user.id);
        recordAuditLog(req, 'RECEIPT_STATUS_UPDATED', 'receipt', receipt.id, `Updated status of ${receipt.receipt_number} to ${receipt.status}`);
        res.json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
});

// Validate receipt (Stock Increase + Stock Ledger entry)
router.post('/:id/validate', requirePermission('receipt.validate'), (req, res, next) => {
    try {
        const receipt = receiptsService.validateReceipt(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'RECEIPT_VALIDATED', 'receipt', receipt.id, `Validated receipt ${receipt.receipt_number}; stock ledger updated`);
        res.json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
});

// Cancel receipt
router.post('/:id/cancel', requirePermission('receipt.cancel'), (req, res, next) => {
    try {
        const receipt = receiptsService.cancelReceipt(req.user.organization_id, req.params.id, req.user.id);
        recordAuditLog(req, 'RECEIPT_CANCELED', 'receipt', receipt.id, `Canceled receipt ${receipt.receipt_number}`);
        res.json({ success: true, data: receipt });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
