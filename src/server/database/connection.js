const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure database directory exists
const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database instance
const db = new DatabaseSync(config.db.path);

// Configure for high performance, ACID compliance, and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
}

/**
 * Database utility wrapper with prepared statements and query helpers
 */
const dbHelper = {
    raw: db,

    // Run query and return all matching rows
    query(sql, params = []) {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
    },

    // Run query and return first row (or null)
    getOne(sql, params = []) {
        const stmt = db.prepare(sql);
        const result = stmt.get(...params);
        return result || null;
    },

    // Run statement (INSERT, UPDATE, DELETE) and return changes info
    execute(sql, params = []) {
        const stmt = db.prepare(sql);
        return stmt.run(...params);
    },

    // Execute multiple operations within an atomic ACID transaction
    transaction(fn) {
        db.exec('BEGIN IMMEDIATE');
        try {
            const result = fn(this);
            db.exec('COMMIT');
            return result;
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }
};

module.exports = dbHelper;
