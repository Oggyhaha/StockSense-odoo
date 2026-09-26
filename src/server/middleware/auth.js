const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/connection');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'AuthenticationRequired',
            message: 'Access token is missing or invalid'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);

        // Fetch fresh user details with role and permissions
        const user = db.getOne(`
            SELECT u.id, u.organization_id, u.email, u.name, u.timezone, u.is_active,
                   r.name as role_name, r.id as role_id, o.name as organization_name
            FROM users u
            JOIN organizations o ON u.organization_id = o.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = ?
        `, [decoded.userId]);

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'User account not found or deactivated'
            });
        }

        // Fetch all permissions for this role
        const permissions = db.query(`
            SELECT p.name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `, [user.role_id]).map(p => p.name);

        req.user = {
            id: user.id,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            role: user.role_name,
            permissions: permissions
        };

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'InvalidToken',
            message: 'Session expired or token is invalid'
        });
    }
}

module.exports = {
    authenticateToken
};
