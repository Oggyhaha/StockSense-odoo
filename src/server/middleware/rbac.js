/**
 * Role-Based Access Control (RBAC) middleware
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Admin bypasses all checks
        if (req.user.role === 'ADMIN') {
            return next();
        }

        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Permission denied: Missing '${permission}' capability`
            });
        }

        next();
    };
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Access denied: Role must be one of [${allowedRoles.join(', ')}]`
            });
        }

        next();
    };
}

module.exports = {
    requirePermission,
    requireRole
};
