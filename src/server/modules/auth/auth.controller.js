const express = require('express');
const authService = require('./auth.service');
const { authenticateToken } = require('../../middleware/auth');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.post('/register', (req, res, next) => {
    try {
        const { name, email, password, organizationName } = req.body;
        if (!name || !email || !password || !organizationName) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Name, email, password, and organization name are all required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Password must be at least 8 characters long'
            });
        }

        const result = authService.register({ name, email, password, organizationName });
        recordAuditLog({ user: result.user, headers: req.headers, socket: req.socket }, 'USER_REGISTERED', 'user', result.user.id, 'New account and organization created');

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
});

router.post('/login', (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Email and password are required'
            });
        }

        const result = authService.login(email, password);
        recordAuditLog({ user: result.user, headers: req.headers, socket: req.socket }, 'USER_LOGIN', 'user', result.user.id, 'User logged in successfully');

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            error: 'AuthenticationFailed',
            message: err.message
        });
    }
});

router.post('/refresh', (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Refresh token is required'
            });
        }

        const tokens = authService.refreshToken(refreshToken);
        res.json({
            success: true,
            data: tokens
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            error: 'InvalidToken',
            message: err.message
        });
    }
});

router.post('/logout', (req, res) => {
    const { refreshToken } = req.body;
    authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/forgot-password', (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Email address is required'
            });
        }

        const result = authService.requestPasswordResetOtp(email);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
});

router.post('/verify-otp', (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Email and OTP code are required'
            });
        }

        const result = authService.verifyOtp(email, otp);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: 'OtpVerificationFailed',
            message: err.message
        });
    }
});

router.post('/reset-password', (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Email, OTP, and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'New password must be at least 8 characters long'
            });
        }

        const result = authService.resetPasswordWithOtp(email, otp, newPassword);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: 'PasswordResetFailed',
            message: err.message
        });
    }
});

router.get('/me', authenticateToken, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

// Demo Persona Quick-Switcher for Hackathon Evaluation
router.post('/demo-switch', (req, res, next) => {
    try {
        const { role } = req.body;
        const validRoles = ['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF', 'VIEWER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid demo role' });
        }

        const result = authService.switchDemoUser(role);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
