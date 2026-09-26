const path = require('path');
require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '2h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'stocksense_refresh_super_secret_key_2026',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    db: {
        path: process.env.DATABASE_PATH || path.join(__dirname, '..', '..', '..', 'data', 'stocksense.db')
    },
    system: {
        otpValidityMinutes: 10,
        defaultApprovalThreshold: 500.0,
        allowNegativeStockDefault: false
    }
};

module.exports = config;
