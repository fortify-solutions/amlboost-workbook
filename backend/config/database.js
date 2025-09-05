import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'amlboost',
  user: process.env.DB_USER || 'amlboost_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});