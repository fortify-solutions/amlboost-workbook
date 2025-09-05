import { pool } from '../config/database.js';
import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';

const CSV_FILE = '../../public/transactions_latam.csv';
const SAMPLE_SIZE = 50000; // Load first 50K rows for demo
const BATCH_SIZE = 1000;

// Column mapping from LATAM CSV to database schema
const COLUMN_MAPPING = {
  'user_id': 'user_id',
  'merchant_id': 'merchant_id', 
  'charged_amount': 'charged_amount',
  'txn_date_time': 'txn_date_time',
  'outcome': 'outcome',
  'fraud': 'fraud',
  'decline': 'decline',
  'merchant_country': 'merchant_country',
  'merchant_name': 'merchant_name',
  'mcc': 'mcc',
  'type': 'payment_method'
};

async function seedSampleData() {
  const client = await pool.connect();
  
  try {
    console.log(`🌎 Starting LATAM sample dataset import (${SAMPLE_SIZE.toLocaleString()} rows)...`);
    
    // Clear existing data
    console.log('🗑️  Clearing existing transaction data...');
    await client.query('TRUNCATE TABLE transactions RESTART IDENTITY');
    
    // Get file path
    const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), CSV_FILE);
    console.log(`📄 Reading CSV file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }
    
    let processedRows = 0;
    let batch = [];
    let headers = null;
    
    // Create dataset record
    const datasetResult = await client.query(
      `INSERT INTO datasets (name, filename, status, processing_started_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      ['LATAM Sample', 'transactions_latam_sample.csv', 'processing']
    );
    const datasetId = datasetResult.rows[0].id;
    
    console.log(`📊 Created dataset record with ID: ${datasetId}`);
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('headers', (headerList) => {
          headers = headerList;
          console.log(`📋 CSV headers detected:`, headers.slice(0, 10), '...');
          console.log(`🔄 Processing first ${SAMPLE_SIZE.toLocaleString()} rows...`);
        })
        .on('data', (row) => {
          // Stop after sample size
          if (processedRows >= SAMPLE_SIZE) {
            stream.destroy();
            return;
          }
          
          batch.push(row);
          
          // Process in batches
          if (batch.length >= BATCH_SIZE) {
            processBatchSync(client, batch)
              .then(() => {
                processedRows += batch.length;
                batch = [];
                
                if (processedRows % 10000 === 0) {
                  console.log(`📈 Processed ${processedRows.toLocaleString()} rows...`);
                }
              })
              .catch((error) => {
                console.error('❌ Batch processing error:', error);
                reject(error);
              });
          }
        })
        .on('end', async () => {
          await finishProcessing(client, batch, processedRows, datasetId, resolve, reject);
        })
        .on('close', async () => {
          await finishProcessing(client, batch, processedRows, datasetId, resolve, reject);
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function finishProcessing(client, batch, processedRows, datasetId, resolve, reject) {
  try {
    // Process remaining batch
    if (batch.length > 0) {
      await processBatchSync(client, batch);
      processedRows += batch.length;
    }
    
    // Update final dataset status
    await client.query(
      `UPDATE datasets SET 
       status = 'completed', 
       total_rows = $1, 
       processed_rows = $2,
       processing_completed_at = NOW()
       WHERE id = $3`,
      [processedRows, processedRows, datasetId]
    );
    
    console.log(`✅ LATAM sample dataset import completed!`);
    console.log(`📊 Final stats: ${processedRows.toLocaleString()} rows processed`);
    
    // Show some sample statistics
    await showDatasetStats(client);
    
    resolve();
  } catch (error) {
    console.error('❌ Final processing error:', error);
    reject(error);
  }
}

// Process batch synchronously to avoid connection issues
async function processBatchSync(client, batch) {
  if (batch.length === 0) return;
  
  const dbColumns = [
    'user_id', 'merchant_id', 'charged_amount', 'txn_date_time', 'outcome',
    'fraud', 'decline', 'merchant_country', 'merchant_name', 'mcc', 'payment_method'
  ];
  
  const values = [];
  const placeholders = [];
  
  let paramCount = 1;
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const rowPlaceholders = [];
    
    for (const dbColumn of dbColumns) {
      const csvColumn = Object.keys(COLUMN_MAPPING).find(key => COLUMN_MAPPING[key] === dbColumn);
      let value = csvColumn ? row[csvColumn] : null;
      
      // Type conversions and validations
      if (dbColumn === 'charged_amount' && value) {
        const numValue = parseFloat(value);
        value = isNaN(numValue) ? null : numValue;
      } else if (dbColumn === 'txn_date_time' && value) {
        try {
          const date = new Date(value);
          value = isNaN(date.getTime()) ? null : date.toISOString();
        } catch (e) {
          value = null;
        }
      } else if ((dbColumn === 'fraud' || dbColumn === 'decline') && value !== null && value !== '') {
        const numValue = parseInt(value);
        value = isNaN(numValue) ? 0 : numValue;
      } else if (dbColumn === 'mcc' && value) {
        value = String(value).split('.')[0];
      }
      
      values.push(value);
      rowPlaceholders.push(`$${paramCount++}`);
    }
    
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }
  
  const insertSQL = `
    INSERT INTO transactions (${dbColumns.join(', ')})
    VALUES ${placeholders.join(', ')}
  `;
  
  await client.query(insertSQL, values);
}

// Show dataset statistics after import
async function showDatasetStats(client) {
  console.log('\n📊 Dataset Statistics:');
  console.log('=' .repeat(50));
  
  try {
    const basicStats = await client.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT merchant_id) as unique_merchants,
        SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_transactions,
        SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END) as declined_transactions,
        MIN(txn_date_time) as earliest_transaction,
        MAX(txn_date_time) as latest_transaction,
        ROUND(AVG(charged_amount), 2) as avg_amount,
        ROUND(SUM(charged_amount), 2) as total_volume
      FROM transactions
    `);
    
    const stats = basicStats.rows[0];
    
    console.log(`Total Transactions: ${parseInt(stats.total_transactions).toLocaleString()}`);
    console.log(`Unique Users: ${parseInt(stats.unique_users).toLocaleString()}`);
    console.log(`Unique Merchants: ${parseInt(stats.unique_merchants).toLocaleString()}`);
    console.log(`Fraud Transactions: ${parseInt(stats.fraud_transactions).toLocaleString()}`);
    console.log(`Declined Transactions: ${parseInt(stats.declined_transactions).toLocaleString()}`);
    console.log(`Date Range: ${stats.earliest_transaction} to ${stats.latest_transaction}`);
    console.log(`Average Amount: $${stats.avg_amount}`);
    console.log(`Total Volume: $${parseFloat(stats.total_volume).toLocaleString()}`);
    
    // Top countries
    console.log('\n🌍 Top Countries by Transaction Volume:');
    const countryStats = await client.query(`
      SELECT merchant_country, COUNT(*) as transaction_count
      FROM transactions 
      WHERE merchant_country IS NOT NULL 
      GROUP BY merchant_country 
      ORDER BY transaction_count DESC 
      LIMIT 5
    `);
    
    countryStats.rows.forEach(row => {
      console.log(`  ${row.merchant_country}: ${parseInt(row.transaction_count).toLocaleString()} transactions`);
    });
    
  } catch (error) {
    console.error('Error generating statistics:', error);
  }
  
  console.log('=' .repeat(50));
}

// Run the seed process
async function main() {
  try {
    await seedSampleData();
    console.log('🎉 LATAM sample dataset seeding completed successfully!');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();