const app = require('./app');
const config = require('./config');
const db = require('./database/connection');
const seedDatabase = require('./database/seed');

const PORT = config.port || 3000;

// Auto-seed on first run if database is empty
async function ensureSeeded() {
    try {
        const orgCount = db.getOne(`SELECT COUNT(*) as count FROM organizations`).count;
        if (orgCount === 0) {
            console.log('📦 Database empty — auto-seeding demo data...');
            seedDatabase();
            console.log('✅ Auto-seed complete');
        }
    } catch (e) {
        // Table might not exist yet (first run), seed will handle it
        console.log('📦 First run detected — seeding database...');
        seedDatabase();
        console.log('✅ Seed complete');
    }
}

ensureSeeded().then(() => {
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
});
