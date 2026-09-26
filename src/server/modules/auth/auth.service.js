const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../../database/connection');

class AuthService {
    generateTokens(userId) {
        const accessToken = jwt.sign({ userId }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });

        const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn
        });

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        db.execute(`
            INSERT INTO refresh_tokens (id, user_id, token, expires_at)
            VALUES (?, ?, ?, ?)
        `, [crypto.randomUUID(), userId, refreshToken, expiresAt]);

        return { accessToken, refreshToken };
    }

    getUserWithPermissions(userId) {
        const user = db.getOne(`
            SELECT u.id, u.organization_id, u.email, u.name, u.timezone, u.is_active, u.last_login_at,
                   r.name as role, r.id as role_id, o.name as organization_name, o.currency, o.code as org_code
            FROM users u
            JOIN organizations o ON u.organization_id = o.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = ?
        `, [userId]);

        if (!user) return null;

        const permissions = db.query(`
            SELECT p.name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `, [user.role_id]).map(p => p.name);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
            organization_code: user.org_code,
            currency: user.currency,
            timezone: user.timezone,
            permissions
        };
    }

    register({ name, email, password, organizationName }) {
        const existing = db.getOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
        if (existing) {
            throw new Error('A user with this email address already exists');
        }

        return db.transaction(() => {
            const orgId = crypto.randomUUID();
            const orgCode = organizationName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + Math.floor(100 + Math.random() * 900);
            
            db.execute(`
                INSERT INTO organizations (id, name, code, currency, timezone)
                VALUES (?, ?, ?, 'USD', 'America/New_York')
            `, [orgId, organizationName, orgCode]);

            const userId = crypto.randomUUID();
            const passwordHash = bcrypt.hashSync(password, 10);

            db.execute(`
                INSERT INTO users (id, organization_id, email, password_hash, name, timezone)
                VALUES (?, ?, ?, ?, ?, 'America/New_York')
            `, [userId, orgId, email.toLowerCase().trim(), passwordHash, name.trim()]);

            // Assign Admin role to the creator
            const adminRole = db.getOne(`SELECT id FROM roles WHERE name = 'ADMIN'`);
            if (adminRole) {
                db.execute(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, adminRole.id]);
            }

            // Create default categories and UoM
            const uomPcs = crypto.randomUUID();
            db.execute(`INSERT INTO units_of_measure (id, organization_id, name, symbol, is_default) VALUES (?, ?, 'Pieces', 'pcs', 1)`, [uomPcs, orgId]);
            db.execute(`INSERT INTO categories (id, organization_id, name, description) VALUES (?, ?, 'General Inventory', 'Default category for items')`, [crypto.randomUUID(), orgId]);

            // Default warehouse and locations
            const whId = crypto.randomUUID();
            db.execute(`INSERT INTO warehouses (id, organization_id, name, code, is_active) VALUES (?, ?, 'Main Warehouse', 'WH-01', 1)`, [whId, orgId]);
            db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'Receiving Dock', 'REC-01', 'RECEIVING')`, [crypto.randomUUID(), orgId, whId]);
            db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'General Storage', 'GEN-01', 'STORAGE')`, [crypto.randomUUID(), orgId, whId]);
            db.execute(`INSERT INTO locations (id, organization_id, warehouse_id, name, code, location_type) VALUES (?, ?, ?, 'Outbound Dispatch', 'OUT-01', 'DISPATCH')`, [crypto.randomUUID(), orgId, whId]);

            const tokens = this.generateTokens(userId);
            const user = this.getUserWithPermissions(userId);

            return { tokens, user };
        });
    }

    login(email, password) {
        const user = db.getOne(`
            SELECT id, password_hash, is_active
            FROM users
            WHERE email = ?
        `, [email.toLowerCase().trim()]);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        if (!user.is_active) {
            throw new Error('Account has been deactivated. Please contact your administrator.');
        }

        const match = bcrypt.compareSync(password, user.password_hash);
        if (!match) {
            throw new Error('Invalid email or password');
        }

        // Record last login
        db.execute(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, [user.id]);

        const tokens = this.generateTokens(user.id);
        const userProfile = this.getUserWithPermissions(user.id);

        return { tokens, user: userProfile };
    }

    refreshToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.refreshSecret);
            const stored = db.getOne(`
                SELECT id, user_id, revoked_at, expires_at
                FROM refresh_tokens
                WHERE token = ? AND revoked_at IS NULL
            `, [token]);

            if (!stored) {
                throw new Error('Invalid or revoked refresh token');
            }

            if (new Date(stored.expires_at) < new Date()) {
                throw new Error('Refresh token has expired');
            }

            // Invalidate current refresh token (rotation)
            db.execute(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?`, [stored.id]);

            // Issue new pair
            return this.generateTokens(stored.user_id);
        } catch (e) {
            throw new Error('Invalid refresh token');
        }
    }

    logout(token) {
        if (token) {
            db.execute(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token = ?`, [token]);
        }
        return true;
    }

    requestPasswordResetOtp(email) {
        const cleanEmail = email.toLowerCase().trim();
        const user = db.getOne(`SELECT id, email, name FROM users WHERE email = ?`, [cleanEmail]);
        if (!user) {
            // For security, do not disclose if user doesn't exist
            return { message: 'If an account matches this email, a reset OTP code has been issued.', otp: null };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Invalidate older unused OTPs for this email
        db.execute(`UPDATE otp_requests SET is_used = 1 WHERE email = ? AND is_used = 0`, [cleanEmail]);

        db.execute(`
            INSERT INTO otp_requests (id, email, otp_code, expires_at, is_used)
            VALUES (?, ?, ?, ?, 0)
        `, [crypto.randomUUID(), cleanEmail, otp, expiresAt]);

        return {
            message: 'OTP sent successfully. Valid for 10 minutes.',
            // Return otp directly in development/demo mode to facilitate instant hackathon testing
            demoOtp: otp,
            email: cleanEmail
        };
    }

    verifyOtp(email, otpCode) {
        const cleanEmail = email.toLowerCase().trim();
        const record = db.getOne(`
            SELECT id, expires_at, is_used
            FROM otp_requests
            WHERE email = ? AND otp_code = ? AND is_used = 0
            ORDER BY created_at DESC
            LIMIT 1
        `, [cleanEmail, otpCode.trim()]);

        if (!record) {
            throw new Error('Invalid or expired OTP code');
        }

        if (new Date(record.expires_at) < new Date()) {
            throw new Error('OTP code has expired. Please request a new one.');
        }

        return { verified: true, otpId: record.id };
    }

    resetPasswordWithOtp(email, otpCode, newPassword) {
        const cleanEmail = email.toLowerCase().trim();
        const verification = this.verifyOtp(cleanEmail, otpCode);

        const passwordHash = bcrypt.hashSync(newPassword, 10);

        db.transaction(() => {
            db.execute(`UPDATE otp_requests SET is_used = 1 WHERE id = ?`, [verification.otpId]);
            db.execute(`
                UPDATE users SET password_hash = ?, updated_at = datetime('now')
                WHERE email = ?
            `, [passwordHash, cleanEmail]);

            // Invalidate all active refresh tokens for this user
            const user = db.getOne(`SELECT id FROM users WHERE email = ?`, [cleanEmail]);
            if (user) {
                db.execute(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?`, [user.id]);
            }
        });

        return { success: true, message: 'Password has been successfully reset. Please log in.' };
    }

    switchDemoUser(targetRole) {
        const user = db.getOne(`
            SELECT u.id, u.email
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = ? AND u.organization_id = 'org-apex-global'
            LIMIT 1
        `, [targetRole]);

        if (!user) {
            throw new Error(`Demo user for role ${targetRole} not found`);
        }

        const tokens = this.generateTokens(user.id);
        const userProfile = this.getUserWithPermissions(user.id);
        return { tokens, user: userProfile };
    }
}

module.exports = new AuthService();
