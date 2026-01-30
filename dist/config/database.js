"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDB = getDB;
exports.closeDatabase = closeDatabase;
const pg_1 = require("pg");
const logger_1 = require("./logger");
const logger = new logger_1.Logger('Database');
let pool = null;
async function initializeDatabase() {
    if (pool) {
        return pool;
    }
    pool = new pg_1.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'canton_bridge',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    });
    pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
    });
    try {
        const client = await pool.connect();
        logger.info('Database connected successfully');
        client.release();
        await createTablesIfNotExist();
    }
    catch (err) {
        logger.error('Failed to connect to database', err);
        throw err;
    }
    return pool;
}
function getDB() {
    if (!pool) {
        throw new Error('Database not initialized');
    }
    return pool;
}
async function createTablesIfNotExist() {
    if (!pool)
        return;
    const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS deposit_addresses (
      id UUID PRIMARY KEY,
      address VARCHAR(255) UNIQUE NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      canton_address VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      expected_amount NUMERIC,
      received_amount NUMERIC,
      eth_tx_hash VARCHAR(255),
      canton_tx_hash VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deposit_transactions (
      id UUID PRIMARY KEY,
      deposit_address_id UUID NOT NULL REFERENCES deposit_addresses(id),
      eth_tx_hash VARCHAR(255) UNIQUE NOT NULL,
      amount NUMERIC NOT NULL,
      from_address VARCHAR(255) NOT NULL,
      confirmations INTEGER DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_deposit_addresses_user_id ON deposit_addresses(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposit_addresses_address ON deposit_addresses(address);
    CREATE INDEX IF NOT EXISTS idx_deposit_addresses_canton_address ON deposit_addresses(canton_address);
    CREATE INDEX IF NOT EXISTS idx_deposit_transactions_eth_tx_hash ON deposit_transactions(eth_tx_hash);
    CREATE INDEX IF NOT EXISTS idx_deposit_transactions_status ON deposit_transactions(status);
  `;
    try {
        await pool.query(createTablesSQL);
        logger.info('Tables created successfully');
    }
    catch (err) {
        logger.error('Failed to create tables', err);
    }
}
async function closeDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('Database connection closed');
    }
}
//# sourceMappingURL=database.js.map