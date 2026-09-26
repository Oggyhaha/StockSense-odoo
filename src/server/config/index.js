const path = require('path');
require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_jwt_secret_change_in_production'),
        expiresIn: process.env.JWT_EXPIRES_IN || '2h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_refresh_secret_change_in_production'),
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
