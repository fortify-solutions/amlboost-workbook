import { pool } from '../config/database.js';

const migrations = [
  {
    name: 'create_transactions_table',
    sql: `
      CREATE TABLE IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        merchant_id VARCHAR(255),
        charged_amount DECIMAL(15,2),
        txn_date_time TIMESTAMP,
        outcome VARCHAR(50),
        fraud INTEGER DEFAULT 0,
        decline INTEGER DEFAULT 0,
        merchant_country VARCHAR(100),
        merchant_name TEXT,
        mcc VARCHAR(10),
        payment_method VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'create_indexes',
    sql: `
      -- Performance indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_txn_date_time ON transactions(txn_date_time);
      CREATE INDEX IF NOT EXISTS idx_transactions_fraud ON transactions(fraud);
      CREATE INDEX IF NOT EXISTS idx_transactions_decline ON transactions(decline);
      CREATE INDEX IF NOT EXISTS idx_transactions_outcome ON transactions(outcome);
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant_country ON transactions(merchant_country);
      CREATE INDEX IF NOT EXISTS idx_transactions_mcc ON transactions(mcc);
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
      
      -- Composite indexes for common query patterns
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date_time);
      CREATE INDEX IF NOT EXISTS idx_transactions_fraud_amount ON transactions(fraud, charged_amount);
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant_date ON transactions(merchant_id, txn_date_time);
      
      -- Partial indexes for performance
      CREATE INDEX IF NOT EXISTS idx_transactions_fraud_only ON transactions(user_id, txn_date_time) WHERE fraud = 1;
      CREATE INDEX IF NOT EXISTS idx_transactions_high_amount ON transactions(charged_amount) WHERE charged_amount > 1000;
    `
  },
  {
    name: 'create_datasets_table',
    sql: `
      CREATE TABLE IF NOT EXISTS datasets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255),
        total_rows BIGINT DEFAULT 0,
        processed_rows BIGINT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processing_started_at TIMESTAMP,
        processing_completed_at TIMESTAMP,
        error_message TEXT,
        column_mappings JSONB
      );
    `
  },
  {
    name: 'create_query_cache_table',
    sql: `
      CREATE TABLE IF NOT EXISTS query_cache (
        id SERIAL PRIMARY KEY,
        query_hash VARCHAR(64) UNIQUE NOT NULL,
        query_text TEXT NOT NULL,
        result_count BIGINT,
        cached_result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        hit_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
      CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);
    `
  }
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check which migrations have already been run
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations'
    );
    const executedNames = new Set(executedMigrations.map(row => row.name));
    
    // Run pending migrations
    for (const migration of migrations) {
      if (executedNames.has(migration.name)) {
        console.log(`⏭️  Skipping migration: ${migration.name} (already executed)`);
        continue;
      }
      
      console.log(`📝 Running migration: ${migration.name}`);
      await client.query('BEGIN');
      
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
        await client.query('COMMIT');
        console.log(`✅ Migration completed: ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    
    console.log('🎉 All migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();