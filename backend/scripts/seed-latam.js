import { pool } from '../config/database.js';
import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';

const CSV_FILE = '../../public/transactions_latam.csv';
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
  'type': 'payment_method'  // Map 'type' to 'payment_method'
};

async function seedLATAMData() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🌎 Starting LATAM dataset import...');
    
    // Clear existing data
    console.log('🗑️  Clearing existing transaction data...');
    await client.query('TRUNCATE TABLE transactions RESTART IDENTITY');
    
    // Get file path
    const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), CSV_FILE);
    console.log(`📄 Reading CSV file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }
    
    let totalRows = 0;
    let processedRows = 0;
    let batch = [];
    let headers = null;
    
    // Create dataset record
    const datasetResult = await client.query(
      `INSERT INTO datasets (name, filename, status, processing_started_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      ['LATAM Transactions', 'transactions_latam.csv', 'processing']
    );
    const datasetId = datasetResult.rows[0].id;
    
    console.log(`📊 Created dataset record with ID: ${datasetId}`);
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('headers', (headerList) => {
          headers = headerList;
          console.log(`📋 CSV headers detected:`, headers);
          console.log(`🔄 Starting data processing...`);
        })
        .on('data', (row) => {
          totalRows++;
          batch.push(row);
          
          // Process in batches (synchronously to avoid connection issues)
          if (batch.length >= BATCH_SIZE) {
            // Pause the stream to process the batch
            stream.pause();
            
            processBatch(client, batch)
              .then(() => {
                processedRows += batch.length;
                batch = [];
                
                // Update progress
                if (processedRows % 10000 === 0) {
                  console.log(`📈 Processed ${processedRows.toLocaleString()} rows...`);
                  return client.query(
                    'UPDATE datasets SET processed_rows = $1, total_rows = $2 WHERE id = $3',
                    [processedRows, totalRows, datasetId]
                  );
                }
              })
              .then(() => {
                // Resume the stream
                stream.resume();
              })
              .catch((error) => {
                console.error('❌ Batch processing error:', error);
                reject(error);
              });
          }
        })
        .on('end', async () => {
          try {
            // Process remaining batch
            if (batch.length > 0) {
              await processBatch(client, batch);
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
              [totalRows, processedRows, datasetId]
            );
            
            console.log(`✅ LATAM dataset import completed!`);
            console.log(`📊 Final stats: ${processedRows.toLocaleString()}/${totalRows.toLocaleString()} rows processed`);
            
            // Show some sample statistics
            await showDatasetStats(client);
            
            resolve();
          } catch (error) {
            console.error('❌ Final processing error:', error);
            reject(error);
          }
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

// Process a batch of rows with proper column mapping
async function processBatch(client, batch) {
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
      // Find the CSV column that maps to this database column
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
        // Ensure MCC is treated as string but clean up any decimals
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
    // Basic counts
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
      LIMIT 10
    `);
    
    countryStats.rows.forEach(row => {
      console.log(`  ${row.merchant_country}: ${parseInt(row.transaction_count).toLocaleString()} transactions`);
    });
    
    // Fraud rate by country
    console.log('\n🚨 Fraud Rates by Top Countries:');
    const fraudStats = await client.query(`
      SELECT 
        merchant_country,
        COUNT(*) as total_txns,
        SUM(fraud) as fraud_txns,
        ROUND(100.0 * SUM(fraud) / COUNT(*), 2) as fraud_rate_pct
      FROM transactions 
      WHERE merchant_country IS NOT NULL 
      GROUP BY merchant_country 
      HAVING COUNT(*) > 1000
      ORDER BY fraud_rate_pct DESC 
      LIMIT 10
    `);
    
    fraudStats.rows.forEach(row => {
      console.log(`  ${row.merchant_country}: ${row.fraud_rate_pct}% (${row.fraud_txns}/${row.total_txns})`);
    });
    
  } catch (error) {
    console.error('Error generating statistics:', error);
  }
  
  console.log('=' .repeat(50));
}

// Run the seed process
async function main() {
  try {
    await seedLATAMData();
    console.log('🎉 LATAM dataset seeding completed successfully!');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();