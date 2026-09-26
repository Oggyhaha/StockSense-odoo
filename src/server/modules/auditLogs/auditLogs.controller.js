const express = require('express');
const db = require('../../database/connection');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireRole('ADMIN', 'INVENTORY_MANAGER'), (req, res, next) => {
    try {
        const { search, limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let whereClauses = ['a.organization_id = ?'];
        let params = [req.user.organization_id];

        if (search) {
            whereClauses.push('(a.action LIKE ? OR a.details LIKE ? OR u.name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        const whereSql = whereClauses.join(' AND ');

        const items = db.query(`
            SELECT 
                a.id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
                u.name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE ${whereSql}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit, 10), offset]);

        const countSql = `SELECT COUNT(*) as total FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE ${whereSql}`;
        const total = db.getOne(countSql, params).total;

        res.json({
            success: true,
            data: {
                items,
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
