const express = require('express');
const db = require('../../database/connection');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// Get Organization Profile
router.get('/organization', (req, res, next) => {
    try {
        const org = db.getOne(`
            SELECT id, name, code, logo_url, currency, timezone, allow_negative_stock, adjustment_approval_threshold, created_at, updated_at
            FROM organizations
            WHERE id = ?
        `, [req.user.organization_id]);

        res.json({ success: true, data: org });
    } catch (err) {
        next(err);
    }
});

// Update Organization Profile
router.patch('/organization', requireRole('ADMIN'), (req, res, next) => {
    try {
        const { name, currency, timezone } = req.body;
        db.execute(`
            UPDATE organizations SET
                name = COALESCE(?, name),
                currency = COALESCE(?, currency),
                timezone = COALESCE(?, timezone),
                updated_at = datetime('now')
            WHERE id = ?
        `, [name ? name.trim() : null, currency ? currency.trim().toUpperCase() : null, timezone ? timezone.trim() : null, req.user.organization_id]);

        const updated = db.getOne(`SELECT * FROM organizations WHERE id = ?`, [req.user.organization_id]);
        recordAuditLog(req, 'ORGANIZATION_UPDATED', 'organization', req.user.organization_id, 'Updated organization settings');
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
});

// Get Inventory Settings
router.get('/inventory', (req, res, next) => {
    try {
        const org = db.getOne(`
            SELECT allow_negative_stock, adjustment_approval_threshold
            FROM organizations
            WHERE id = ?
        `, [req.user.organization_id]);

        res.json({
            success: true,
            data: {
                allow_negative_stock: !!org.allow_negative_stock,
                adjustment_approval_threshold: org.adjustment_approval_threshold
            }
        });
    } catch (err) {
        next(err);
    }
});

// Update Inventory Settings
router.patch('/inventory', requireRole('ADMIN'), (req, res, next) => {
    try {
        const { allow_negative_stock, adjustment_approval_threshold } = req.body;

        db.execute(`
            UPDATE organizations SET
                allow_negative_stock = COALESCE(?, allow_negative_stock),
                adjustment_approval_threshold = COALESCE(?, adjustment_approval_threshold),
                updated_at = datetime('now')
            WHERE id = ?
        `, [
            allow_negative_stock !== undefined ? (allow_negative_stock ? 1 : 0) : null,
            adjustment_approval_threshold !== undefined ? parseFloat(adjustment_approval_threshold) : null,
            req.user.organization_id
        ]);

        const updated = db.getOne(`
            SELECT allow_negative_stock, adjustment_approval_threshold
            FROM organizations WHERE id = ?
        `, [req.user.organization_id]);

        recordAuditLog(req, 'INVENTORY_SETTINGS_UPDATED', 'organization', req.user.organization_id, `Updated inventory policy: allowNegative=${updated.allow_negative_stock}, threshold=${updated.adjustment_approval_threshold}`);

        res.json({
            success: true,
            data: {
                allow_negative_stock: !!updated.allow_negative_stock,
                adjustment_approval_threshold: updated.adjustment_approval_threshold
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
