import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dataset-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Upload and process CSV file
router.post('/csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const client = await pool.connect();
  let datasetId = null;

  try {
    // Create dataset record
    const datasetResult = await client.query(
      `INSERT INTO datasets (name, filename, status) 
       VALUES ($1, $2, 'processing') RETURNING id`,
      [req.body.name || req.file.originalname, req.file.filename]
    );
    
    datasetId = datasetResult.rows[0].id;

    // Start processing in background
    processCSVFile(req.file.path, datasetId);

    res.json({
      success: true,
      datasetId,
      message: 'File uploaded successfully. Processing started.',
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Cleanup on error
    if (datasetId) {
      await client.query('UPDATE datasets SET status = $1, error_message = $2 WHERE id = $3',
        ['error', error.message, datasetId]);
    }
    
    // Remove uploaded file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to process upload' });
  } finally {
    client.release();
  }
});

// Background CSV processing function
async function processCSVFile(filePath, datasetId) {
  const client = await pool.connect();
  
  try {
    await client.query('UPDATE datasets SET processing_started_at = NOW() WHERE id = $1', [datasetId]);
    
    let totalRows = 0;
    let processedRows = 0;
    let headers = null;
    const batchSize = 1000;
    let batch = [];
    
    console.log(`🔄 Starting CSV processing for dataset ${datasetId}: ${filePath}`);
    
    // Clear existing transactions (for now - in production you'd want versioning)
    await client.query('TRUNCATE TABLE transactions');
    
    const stream = fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headerList) => {
        headers = headerList;
        console.log(`📋 CSV headers detected:`, headers);
      })
      .on('data', async (row) => {
        totalRows++;
        batch.push(row);
        
        // Process in batches for better performance
        if (batch.length >= batchSize) {
          try {
            await processBatch(client, batch, headers);
            processedRows += batch.length;
            batch = [];
            
            // Update progress
            await client.query(
              'UPDATE datasets SET processed_rows = $1, total_rows = $2 WHERE id = $3',
              [processedRows, totalRows, datasetId]
            );
            
            if (processedRows % 10000 === 0) {
              console.log(`📊 Processed ${processedRows} rows...`);
            }
          } catch (error) {
            console.error('Batch processing error:', error);
            throw error;
          }
        }
      })
      .on('end', async () => {
        try {
          // Process remaining batch
          if (batch.length > 0) {
            await processBatch(client, batch, headers);
            processedRows += batch.length;
          }
          
          // Mark as completed
          await client.query(
            `UPDATE datasets SET 
             status = 'completed', 
             total_rows = $1, 
             processed_rows = $2,
             processing_completed_at = NOW()
             WHERE id = $3`,
            [totalRows, processedRows, datasetId]
          );
          
          console.log(`✅ CSV processing completed: ${processedRows}/${totalRows} rows`);
          
          // Cleanup uploaded file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
        } catch (error) {
          console.error('Final processing error:', error);
          await client.query(
            'UPDATE datasets SET status = $1, error_message = $2 WHERE id = $3',
            ['error', error.message, datasetId]
          );
        }
      })
      .on('error', async (error) => {
        console.error('CSV parsing error:', error);
        await client.query(
          'UPDATE datasets SET status = $1, error_message = $2 WHERE id = $3',
          ['error', error.message, datasetId]
        );
      });

  } catch (error) {
    console.error('CSV processing error:', error);
    await client.query(
      'UPDATE datasets SET status = $1, error_message = $2 WHERE id = $3',
      ['error', error.message, datasetId]
    );
  } finally {
    client.release();
  }
}

// Process a batch of rows
async function processBatch(client, batch, headers) {
  if (batch.length === 0) return;
  
  // Create parameterized insert query
  const columns = [
    'user_id', 'merchant_id', 'charged_amount', 'txn_date_time', 'outcome',
    'fraud', 'decline', 'merchant_country', 'merchant_name', 'mcc', 'payment_method'
  ];
  
  const values = [];
  const placeholders = [];
  
  let paramCount = 1;
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const rowPlaceholders = [];
    
    for (const column of columns) {
      // Map CSV column to database column and convert types
      let value = row[column] || null;
      
      // Type conversions
      if (column === 'charged_amount' && value) {
        value = parseFloat(value) || null;
      } else if (column === 'txn_date_time' && value) {
        // Handle various date formats
        const date = new Date(value);
        value = isNaN(date.getTime()) ? null : date.toISOString();
      } else if ((column === 'fraud' || column === 'decline') && value !== null) {
        value = parseInt(value) || 0;
      }
      
      values.push(value);
      rowPlaceholders.push(`$${paramCount++}`);
    }
    
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }
  
  const insertSQL = `
    INSERT INTO transactions (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
  `;
  
  await client.query(insertSQL, values);
}

// Get upload status
router.get('/status/:datasetId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM datasets WHERE id = $1',
      [req.params.datasetId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// List all datasets
router.get('/datasets', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, status, total_rows, processed_rows, upload_date FROM datasets ORDER BY upload_date DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Dataset list error:', error);
    res.status(500).json({ error: 'Failed to get datasets' });
  }
});

export default router;