const express = require('express');
const notificationsService = require('./notifications.service');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => {
    try {
        const result = notificationsService.listNotifications(req.user.organization_id, req.user.id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

router.patch('/:id/read', (req, res, next) => {
    try {
        const result = notificationsService.markAsRead(req.user.organization_id, req.user.id, req.params.id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

router.patch('/read-all', (req, res, next) => {
    try {
        const result = notificationsService.markAllAsRead(req.user.organization_id, req.user.id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
