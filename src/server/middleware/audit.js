const crypto = require('crypto');
const db = require('../database/connection');

function recordAuditLog(req, action, entityType, entityId, details) {
    try {
        const id = crypto.randomUUID();
        const orgId = req.user ? req.user.organization_id : 'org-apex-global';
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

        db.execute(`
            INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, orgId, userId, action, entityType, entityId, detailStr, ip, userAgent]);
    } catch (e) {
        console.error('Failed to write audit log:', e.message);
    }
}

module.exports = {
    recordAuditLog
};
