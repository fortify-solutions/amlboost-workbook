import express from 'express';
import { pool } from '../config/database.js';
import crypto from 'crypto';

const router = express.Router();

// Execute SQL query with pagination and caching
router.post('/execute', async (req, res) => {
  const { query, page = 1, limit = 1000 } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  // Security: Only allow SELECT statements
  const cleanQuery = query.trim();
  if (!cleanQuery.toLowerCase().startsWith('select')) {
    return res.status(400).json({ error: 'Only SELECT queries are allowed' });
  }
  
  const client = await pool.connect();
  
  try {
    const offset = (page - 1) * limit;
    const startTime = Date.now();
    
    // Generate query hash for caching
    const queryHash = crypto.createHash('sha256').update(cleanQuery).digest('hex');
    
    // Check cache first
    const cacheResult = await client.query(
      'SELECT cached_result, result_count FROM query_cache WHERE query_hash = $1 AND expires_at > NOW()',
      [queryHash]
    );
    
    let totalCount = 0;
    let data = [];
    
    if (cacheResult.rows.length > 0 && page === 1) {
      // Return cached result for first page
      console.log(`📋 Returning cached result for query: ${queryHash.substring(0, 8)}`);
      
      const cached = cacheResult.rows[0];
      totalCount = cached.result_count;
      data = cached.cached_result.slice(offset, offset + limit);
      
      // Update hit count
      await client.query('UPDATE query_cache SET hit_count = hit_count + 1 WHERE query_hash = $1', [queryHash]);
      
    } else {
      // Execute fresh query
      console.log(`🔍 Executing query: ${cleanQuery.substring(0, 100)}...`);
      
      // Get total count (for pagination)
      const countQuery = `SELECT COUNT(*) as total FROM (${cleanQuery}) as subquery`;
      const countResult = await client.query(countQuery);
      totalCount = parseInt(countResult.rows[0].total);
      
      // Execute paginated query
      const paginatedQuery = `${cleanQuery} LIMIT $1 OFFSET $2`;
      const result = await client.query(paginatedQuery, [limit, offset]);
      data = result.rows;
      
      // Cache results for future use (only cache first 10,000 rows to avoid memory issues)
      if (page === 1 && totalCount <= 10000) {
        const fullResult = await client.query(cleanQuery);
        
        try {
          await client.query(
            `INSERT INTO query_cache (query_hash, query_text, result_count, cached_result, expires_at)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')
             ON CONFLICT (query_hash) 
             DO UPDATE SET 
               cached_result = EXCLUDED.cached_result,
               result_count = EXCLUDED.result_count,
               expires_at = EXCLUDED.expires_at,
               hit_count = 0`,
            [queryHash, cleanQuery, totalCount, JSON.stringify(fullResult.rows)]
          );
        } catch (cacheError) {
          // Don't fail the query if caching fails
          console.warn('Cache update failed:', cacheError.message);
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      executionTime: `${(executionTime / 1000).toFixed(2)}s`,
      cached: cacheResult.rows.length > 0
    });
    
  } catch (error) {
    console.error('Query execution error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      executionTime: '0s'
    });
  } finally {
    client.release();
  }
});

// Get table schema information
router.get('/schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get database statistics
router.get('/stats', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get table statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE user_id IS NOT NULL) as unique_users,
        (SELECT COUNT(DISTINCT merchant_id) FROM transactions WHERE merchant_id IS NOT NULL) as unique_merchants,
        (SELECT COUNT(*) FROM transactions WHERE fraud = 1) as fraud_transactions,
        (SELECT COUNT(*) FROM transactions WHERE decline = 1) as declined_transactions,
        (SELECT MIN(txn_date_time) FROM transactions) as earliest_transaction,
        (SELECT MAX(txn_date_time) FROM transactions) as latest_transaction,
        (SELECT AVG(charged_amount) FROM transactions WHERE charged_amount IS NOT NULL) as avg_amount,
        (SELECT SUM(charged_amount) FROM transactions WHERE charged_amount IS NOT NULL) as total_amount
    `;
    
    const result = await client.query(statsQuery);
    const stats = result.rows[0];
    
    // Get top merchants by transaction count
    const topMerchantsResult = await client.query(`
      SELECT merchant_name, COUNT(*) as transaction_count
      FROM transactions 
      WHERE merchant_name IS NOT NULL 
      GROUP BY merchant_name 
      ORDER BY transaction_count DESC 
      LIMIT 10
    `);
    
    // Get transaction volume by country
    const countryStatsResult = await client.query(`
      SELECT merchant_country, COUNT(*) as transaction_count
      FROM transactions 
      WHERE merchant_country IS NOT NULL 
      GROUP BY merchant_country 
      ORDER BY transaction_count DESC 
      LIMIT 10
    `);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        avg_amount: parseFloat(stats.avg_amount || 0).toFixed(2),
        total_amount: parseFloat(stats.total_amount || 0).toFixed(2)
      },
      topMerchants: topMerchantsResult.rows,
      topCountries: countryStatsResult.rows
    });
    
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Clear query cache
router.delete('/cache', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM query_cache WHERE expires_at < NOW()');
    
    res.json({
      success: true,
      message: `Cleared ${result.rowCount} expired cache entries`
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get query performance insights
router.get('/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        query_text,
        hit_count,
        result_count,
        created_at
      FROM query_cache 
      ORDER BY hit_count DESC, created_at DESC 
      LIMIT 20
    `);
    
    res.json({
      success: true,
      popularQueries: result.rows
    });
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;