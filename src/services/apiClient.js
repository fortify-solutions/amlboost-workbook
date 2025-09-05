// API client for backend communication
export class APIClient {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.isInitialized = false;
  }

  // Initialize API client (replaces SQLite initialization)
  async initialize() {
    try {
      // Test connection to backend
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      if (!response.ok) {
        throw new Error(`Backend unavailable: ${response.status}`);
      }
      
      this.isInitialized = true;
      console.log('✅ API client connected to backend');
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  // Execute SQL query with pagination
  async execute(query, page = 1, limit = 1000) {
    if (!this.isInitialized) {
      await this.initialize();
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Backend not available',
          data: [],
          rowCount: 0
        };
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/query/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, page, limit })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Query execution failed');
      }

      return {
        success: result.success,
        data: result.data,
        rowCount: result.pagination.total,
        pagination: result.pagination,
        executionTime: result.executionTime,
        cached: result.cached
      };

    } catch (error) {
      console.error('Query execution error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        rowCount: 0
      };
    }
  }

  // Get table schema information
  async getTableInfo() {
    try {
      const response = await fetch(`${this.baseURL}/query/schema`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      }));

    } catch (error) {
      console.error('Schema fetch error:', error);
      return [];
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}/query/stats`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        rowCount: parseInt(result.stats.total_transactions || 0),
        columns: await this.getColumnNames()
      };

    } catch (error) {
      console.error('Stats fetch error:', error);
      return { rowCount: 0, columns: [] };
    }
  }

  // Get column names
  async getColumnNames() {
    try {
      const schema = await this.getTableInfo();
      return schema.map(col => col.name);
    } catch (error) {
      console.error('Column names fetch error:', error);
      return [];
    }
  }

  // Upload and process CSV file
  async uploadCSV(file, name) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name) {
        formData.append('name', name);
      }

      const response = await fetch(`${this.baseURL}/upload/csv`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return result;

    } catch (error) {
      console.error('CSV upload error:', error);
      throw error;
    }
  }

  // Check upload status
  async getUploadStatus(datasetId) {
    try {
      const response = await fetch(`${this.baseURL}/upload/status/${datasetId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Status check failed');
      }

      return result;

    } catch (error) {
      console.error('Upload status error:', error);
      throw error;
    }
  }

  // Get sample data
  async getSample(limit = 100) {
    try {
      const response = await fetch(`${this.baseURL}/data/sample?limit=${limit}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;

    } catch (error) {
      console.error('Sample data error:', error);
      return [];
    }
  }

  // Get column information with sample values
  async getColumnInfo() {
    try {
      const response = await fetch(`${this.baseURL}/data/columns`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.columns.reduce((acc, col) => {
        acc[col.name] = {
          type: this.mapPostgresToJSType(col.type),
          sampleValues: col.sampleValues
        };
        return acc;
      }, {});

    } catch (error) {
      console.error('Column info error:', error);
      return {};
    }
  }

  // Map PostgreSQL types to JavaScript types
  mapPostgresToJSType(pgType) {
    const typeMap = {
      'integer': 'numeric',
      'bigint': 'numeric', 
      'numeric': 'numeric',
      'real': 'numeric',
      'double precision': 'numeric',
      'decimal': 'numeric',
      'timestamp without time zone': 'date',
      'timestamp with time zone': 'date',
      'date': 'date',
      'boolean': 'boolean',
      'character varying': 'text',
      'text': 'text',
      'varchar': 'text'
    };
    
    return typeMap[pgType] || 'text';
  }

  // Set data (compatibility method - now handled by upload)
  async setData(data) {
    // For compatibility with existing code
    // In the new architecture, data is uploaded via CSV
    console.warn('setData called on API client - data should be uploaded via CSV');
    return Promise.resolve();
  }

  // Set column types (compatibility method)
  setColumnTypes(types) {
    // Column types are handled by the backend based on CSV analysis
    console.warn('setColumnTypes called on API client - types are auto-detected');
    return Promise.resolve();
  }

  // Close connection (cleanup)
  close() {
    this.isInitialized = false;
  }

  // Get data quality report
  async getDataQuality() {
    try {
      const response = await fetch(`${this.baseURL}/data/quality`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.qualityReport;

    } catch (error) {
      console.error('Data quality error:', error);
      return null;
    }
  }

  // Clear query cache
  async clearCache() {
    try {
      const response = await fetch(`${this.baseURL}/query/cache`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Cache clear error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance (drop-in replacement for sqliteEngine)
export const apiClient = new APIClient();