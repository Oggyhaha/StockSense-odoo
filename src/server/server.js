const app = require('./app');
const config = require('./config');
const db = require('./database/connection');

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  StockSense Inventory Management System is LIVE!   `);
    console.log(`  Environment: ${config.env}                       `);
    console.log(`  URL:         http://localhost:${PORT}             `);
    console.log(`  API Base:    http://localhost:${PORT}/api/v1      `);
    console.log(`  Database:    SQLite WAL mode (ACID compliant)     `);
    console.log(`====================================================`);
});

module.exports = server;
