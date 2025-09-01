import initSqlJs from 'sql.js';

export class SQLiteEngine {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.columnTypes = {};
    this.isInitialized = false;
  }

  // Initialize SQL.js and create database
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize SQL.js with the WASM file
      this.SQL = await initSqlJs({
        locateFile: file => {
          console.log('SQLite requesting file:', file);
          if (file.endsWith('.wasm')) {
            return './sql-wasm.wasm';
          }
          return './sql-wasm.js';
        }
      });
      
      // Create a new database
      this.db = new this.SQL.Database();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQL.js:', error);
      throw new Error('Failed to initialize SQLite engine');
    }
  }

  // Set column types for intelligent formatting
  setColumnTypes(types) {
    this.columnTypes = types || {};
  }

  // Load data from CSV into SQLite database
  async setData(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!data || data.length === 0) {
      return;
    }

    try {
      // Drop existing table if it exists
      this.db.run('DROP TABLE IF EXISTS transactions');

      // Get column names from first row
      const columns = Object.keys(data[0]);
      
      // Create table with appropriate column types
      const columnDefinitions = columns.map(col => {
        const colType = this.columnTypes[col] || 'text';
        let sqlType = 'TEXT';
        
        switch (colType) {
          case 'integer':
            sqlType = 'INTEGER';
            break;
          case 'decimal':
          case 'currency':
          case 'percentage':
            sqlType = 'REAL';
            break;
          case 'boolean':
            sqlType = 'INTEGER'; // Store as 0/1
            break;
          case 'date':
          case 'datetime':
            sqlType = 'TEXT'; // Store as ISO string, can use date functions
            break;
          default:
            sqlType = 'TEXT';
        }
        
        return `${col} ${sqlType}`;
      }).join(', ');

      const createTableSQL = `CREATE TABLE transactions (${columnDefinitions})`;
      this.db.run(createTableSQL);

      // Prepare insert statement
      const placeholders = columns.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO transactions (${columns.join(', ')}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(insertSQL);

      // Insert data in optimized batches for better performance
      const batchSize = 1000;
      const totalRows = data.length;
      console.log(`Inserting ${totalRows} rows in batches of ${batchSize}...`);
      
      this.db.run('BEGIN TRANSACTION');
      
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const row of batch) {
          const values = columns.map(col => {
            const value = row[col];
            const colType = this.columnTypes[col] || 'text';
            
            // Handle type conversions
            if (value === null || value === undefined || value === '') {
              return null;
            }
            
            switch (colType) {
              case 'integer':
                const intVal = parseInt(value);
                return isNaN(intVal) ? null : intVal;
              case 'decimal':
              case 'currency':
              case 'percentage':
                const floatVal = parseFloat(value);
                return isNaN(floatVal) ? null : floatVal;
              case 'boolean':
                // Convert to 0/1
                if (value === '1' || value === 1 || value === true || value === 'true') {
                  return 1;
                }
                if (value === '0' || value === 0 || value === false || value === 'false') {
                  return 0;
                }
                return null;
              default:
                return String(value);
            }
          });
          
          stmt.run(values);
        }
        
        // Commit intermediate transactions for better memory management
        if ((i + batchSize) % 5000 === 0 && i + batchSize < totalRows) {
          this.db.run('COMMIT');
          this.db.run('BEGIN TRANSACTION');
          console.log(`Processed ${i + batchSize}/${totalRows} rows...`);
        }
      }
      
      this.db.run('COMMIT');
      console.log(`Successfully inserted ${totalRows} rows into SQLite database`);
      stmt.free();

      // Create indexes on commonly queried columns
      this.createIndexes(columns);
      
    } catch (error) {
      this.db.run('ROLLBACK');
      console.error('Failed to load data into SQLite:', error);
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }

  // Create indexes on important columns for better performance
  createIndexes(columns) {
    const indexableColumns = ['user_id', 'txn_date_time', 'merchant_id', 'fraud', 'decline', 'outcome'];
    
    indexableColumns.forEach(col => {
      if (columns.includes(col)) {
        try {
          this.db.run(`CREATE INDEX IF NOT EXISTS idx_${col} ON transactions(${col})`);
        } catch (error) {
          // Ignore index creation errors - they're not critical
          console.warn(`Failed to create index on ${col}:`, error.message);
        }
      }
    });
  }

  // Execute SQL query
  execute(query) {
    if (!this.isInitialized || !this.db) {
      return { 
        success: false, 
        error: 'Database not initialized', 
        data: [], 
        rowCount: 0 
      };
    }

    try {
      // Clean up the query
      const cleanQuery = query.trim();
      
      // Security check - only allow SELECT statements
      if (!cleanQuery.toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are supported');
      }

      // Execute the query
      const stmt = this.db.prepare(cleanQuery);
      const results = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      
      stmt.free();

      return { 
        success: true, 
        data: results, 
        rowCount: results.length 
      };
      
    } catch (error) {
      console.error('SQL execution error:', error);
      return { 
        success: false, 
        error: error.message, 
        data: [], 
        rowCount: 0 
      };
    }
  }

  // Get table schema information
  getTableInfo() {
    if (!this.isInitialized || !this.db) {
      return [];
    }

    try {
      const stmt = this.db.prepare('PRAGMA table_info(transactions)');
      const columns = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        columns.push({
          name: row.name,
          type: row.type,
          nullable: !row.notnull,
          defaultValue: row.dflt_value
        });
      }
      
      stmt.free();
      return columns;
    } catch (error) {
      console.error('Failed to get table info:', error);
      return [];
    }
  }

  // Get database statistics
  getStats() {
    if (!this.isInitialized || !this.db) {
      return { rowCount: 0, columns: [] };
    }

    try {
      // Get row count
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM transactions');
      countStmt.step();
      const rowCount = countStmt.getAsObject().count;
      countStmt.free();

      // Get column info
      const columns = this.getTableInfo().map(col => col.name);

      return { rowCount, columns };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return { rowCount: 0, columns: [] };
    }
  }

  // Clean up resources
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const sqliteEngine = new SQLiteEngine();