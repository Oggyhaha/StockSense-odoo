const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// Custom morgan format with colors and details
const morganFormat = ':method :url :status :res[content-length] - :response-time ms :date[iso]';

// Route modules
const authRoutes = require('./modules/auth/auth.controller');
const dashboardRoutes = require('./modules/dashboard/dashboard.controller');
const productsRoutes = require('./modules/products/products.controller');
const warehousesRoutes = require('./modules/warehouses/warehouses.controller');
const receiptsRoutes = require('./modules/receipts/receipts.controller');
const deliveriesRoutes = require('./modules/deliveries/deliveries.controller');
const transfersRoutes = require('./modules/transfers/transfers.controller');
const adjustmentsRoutes = require('./modules/adjustments/adjustments.controller');
const inventoryRoutes = require('./modules/inventory/inventory.controller');
const notificationsRoutes = require('./modules/notifications/notifications.controller');
const auditLogsRoutes = require('./modules/auditLogs/auditLogs.controller');
const settingsRoutes = require('./modules/settings/settings.controller');

const app = express();

// Security and utility middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allows flexible modern UI styling and CDN Google fonts
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (shows method, URL, status, response time)
app.use(morgan(morganFormat, {
    skip: (req, res) => req.path === '/api/health' || req.path.startsWith('/css/') || req.path.startsWith('/js/')
}));

// Health Check Endpoint
const healthHandler = (req, res) => {
    res.json({
        status: 'UP',
        system: 'StockSense Modular IMS',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
};
app.get('/api/health', healthHandler);

// REST API v1 Routes strictly per PRD Section 7
const apiV1 = express.Router();
apiV1.get('/health', healthHandler);
apiV1.use('/auth', authRoutes);
apiV1.use('/dashboard', dashboardRoutes);
apiV1.use('/products', productsRoutes);
apiV1.use('/warehouses', warehousesRoutes);
apiV1.use('/receipts', receiptsRoutes);
apiV1.use('/deliveries', deliveriesRoutes);
apiV1.use('/transfers', transfersRoutes);
apiV1.use('/adjustments', adjustmentsRoutes);
apiV1.use('/inventory', inventoryRoutes);
apiV1.use('/notifications', notificationsRoutes);
apiV1.use('/audit-logs', auditLogsRoutes);
apiV1.use('/settings', settingsRoutes);

app.use('/api/v1', apiV1);

// Static Web Application Client
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA Catch-all fallback
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'NotFound', message: 'API route not found' });
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).send('StockSense Client UI is loading...');
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
