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
            console.log('\n📦 Database empty — auto-seeding demo data...');
            seedDatabase();
            console.log('✅ Auto-seed complete\n');
        }
    } catch (e) {
        console.log('\n📦 First run detected — seeding database...');
        seedDatabase();
        console.log('✅ Seed complete\n');
    }
}

ensureSeeded().then(() => {
    const server = app.listen(PORT, () => {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  StockSense Inventory Management System is LIVE!          ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║  Environment: ${config.env.padEnd(45)} ║`);
        console.log(`║  Frontend:    http://localhost:${PORT}                         ║`);
        console.log(`║  API Base:    http://localhost:${PORT}/api/v1                  ║`);
        console.log(`║  Health:      http://localhost:${PORT}/api/health                ║`);
        console.log(`║  Database:    SQLite WAL mode (ACID compliant)              ║`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  Demo Accounts (1-click login on page):                     ║');
        console.log('║  👑 Admin    │ admin@stocksense.io    │ Password123!        ║');
        console.log('║  📦 Manager  │ manager@stocksense.io  │ Password123!        ║');
        console.log('║  👷 Staff    │ staff@stocksense.io    │ Password123!        ║');
        console.log('║  👁️ Viewer   │ viewer@stocksense.io   │ Password123!        ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  Press Ctrl+C to stop the server                            ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        console.log('📋 Request logs will appear below:\n');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down gracefully...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });

    module.exports = server;
});
