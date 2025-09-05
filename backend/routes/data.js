import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get sample data for preview
router.get('/sample', async (req, res) => {
  const { limit = 100 } = req.query;
  
  try {
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY id LIMIT $1',
      [parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Sample data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get column information
router.get('/columns', async (req, res) => {
  try {
    const schemaResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position
    `);
    
    // Get sample values for each column
    const columns = [];
    for (const col of schemaResult.rows) {
      const sampleResult = await pool.query(
        `SELECT DISTINCT ${col.column_name} 
         FROM transactions 
         WHERE ${col.column_name} IS NOT NULL 
         LIMIT 5`
      );
      
      columns.push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        sampleValues: sampleResult.rows.map(row => row[col.column_name])
      });
    }
    
    res.json({
      success: true,
      columns
    });
  } catch (error) {
    console.error('Column info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export data (for backup/sharing)
router.get('/export', async (req, res) => {
  const { format = 'csv', limit = 10000 } = req.query;
  
  if (format !== 'csv') {
    return res.status(400).json({ error: 'Only CSV export is currently supported' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY id LIMIT $1',
      [parseInt(limit)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }
    
    // Convert to CSV
    const headers = Object.keys(result.rows[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = result.rows.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape CSV values
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    const csv = [csvHeaders, ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');
    res.send(csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data quality report
router.get('/quality', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Check for missing values in key columns
    const qualityChecks = await client.query(`
      SELECT 
        'user_id' as column_name,
        COUNT(*) as total_rows,
        COUNT(user_id) as non_null_count,
        (COUNT(*) - COUNT(user_id)) as null_count,
        ROUND(100.0 * COUNT(user_id) / COUNT(*), 2) as completeness_percent
      FROM transactions
      
      UNION ALL
      
      SELECT 
        'merchant_id',
        COUNT(*),
        COUNT(merchant_id),
        (COUNT(*) - COUNT(merchant_id)),
        ROUND(100.0 * COUNT(merchant_id) / COUNT(*), 2)
      FROM transactions
      
      UNION ALL
      
      SELECT 
        'charged_amount',
        COUNT(*),
        COUNT(charged_amount),
        (COUNT(*) - COUNT(charged_amount)),
        ROUND(100.0 * COUNT(charged_amount) / COUNT(*), 2)
      FROM transactions
      
      UNION ALL
      
      SELECT 
        'txn_date_time',
        COUNT(*),
        COUNT(txn_date_time),
        (COUNT(*) - COUNT(txn_date_time)),
        ROUND(100.0 * COUNT(txn_date_time) / COUNT(*), 2)
      FROM transactions
    `);
    
    // Check for duplicates
    const duplicateCheck = await client.query(`
      SELECT COUNT(*) as total_transactions,
             COUNT(*) - COUNT(DISTINCT (user_id, merchant_id, charged_amount, txn_date_time)) as potential_duplicates
      FROM transactions
    `);
    
    // Data range checks
    const rangeChecks = await client.query(`
      SELECT 
        MIN(charged_amount) as min_amount,
        MAX(charged_amount) as max_amount,
        MIN(txn_date_time) as earliest_date,
        MAX(txn_date_time) as latest_date,
        COUNT(CASE WHEN charged_amount < 0 THEN 1 END) as negative_amounts,
        COUNT(CASE WHEN charged_amount > 10000 THEN 1 END) as high_amounts
      FROM transactions
    `);
    
    res.json({
      success: true,
      qualityReport: {
        completeness: qualityChecks.rows,
        duplicates: duplicateCheck.rows[0],
        ranges: rangeChecks.rows[0]
      }
    });
    
  } catch (error) {
    console.error('Data quality check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;