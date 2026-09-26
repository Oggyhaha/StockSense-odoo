const db = require('../../database/connection');

class NotificationsService {
    listNotifications(orgId, userId) {
        const items = db.query(`
            SELECT *
            FROM notifications
            WHERE organization_id = ? AND (user_id = ? OR user_id IS NULL)
            ORDER BY created_at DESC
            LIMIT 50
        `, [orgId, userId]);

        const unreadCount = db.getOne(`
            SELECT COUNT(*) as count
            FROM notifications
            WHERE organization_id = ? AND (user_id = ? OR user_id IS NULL) AND is_read = 0
        `, [orgId, userId]).count;

        return { items, unreadCount };
    }

    markAsRead(orgId, userId, notifId) {
        db.execute(`
            UPDATE notifications
            SET is_read = 1
            WHERE id = ? AND organization_id = ? AND (user_id = ? OR user_id IS NULL)
        `, [notifId, orgId, userId]);
        return { success: true };
    }

    markAllAsRead(orgId, userId) {
        db.execute(`
            UPDATE notifications
            SET is_read = 1
            WHERE organization_id = ? AND (user_id = ? OR user_id IS NULL)
        `, [orgId, userId]);
        return { success: true };
    }
}

module.exports = new NotificationsService();
