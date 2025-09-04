// CSV loading and parsing service
export class CSVLoader {
  
  // Load column types from configuration file
  async loadColumnTypes() {
    try {
      const response = await fetch('./data-types.json');
      if (response.ok) {
        const config = await response.json();
        return config.columnTypes || {};
      }
    } catch (error) {
      console.warn('Could not load column types configuration:', error);
    }
    return {};
  }
  // Simple CSV parser that handles quoted fields
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // Load and parse CSV file with streaming for large files
  async loadCSV(url, maxRows = 10000) {
    try {
      console.log('Loading CSV from:', url, 'max rows:', maxRows);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Use streaming reader for large files
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let buffer = '';
      let headers = null;
      const data = [];
      let totalRows = 0;
      let rowsProcessed = 0;
      
      console.log('Starting streaming CSV parse...');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (!headers) {
            headers = this.parseCSVLine(line);
            console.log('Headers found:', headers.length, 'columns');
            continue;
          }
          
          totalRows++;
          
          // Only process rows within our limit
          if (rowsProcessed < maxRows) {
            const values = this.parseCSVLine(line);
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
            rowsProcessed++;
          }
          
          // Progress logging and early exit option for large files
          if (totalRows % 10000 === 0) {
            console.log(`Processed ${totalRows} rows, collected ${rowsProcessed} rows`);
          }
          
          // Early exit for very large files to save memory (optional optimization)
          if (totalRows > 1000000 && rowsProcessed >= maxRows) {
            console.log(`Early exit: collected ${rowsProcessed} rows, estimated total > ${totalRows}`);
            reader.cancel();
            break;
          }
        }
      }
      
      // Process any remaining data in buffer
      if (buffer.trim() && headers && rowsProcessed < maxRows) {
        totalRows++;
        const values = this.parseCSVLine(buffer);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
        rowsProcessed++;
      }
      
      if (!headers || data.length === 0) {
        throw new Error('CSV file is empty or invalid');
      }
      
      // Load column types
      const columnTypes = await this.loadColumnTypes();
      
      console.log(`CSV loaded: ${rowsProcessed} rows processed out of ${totalRows} total rows`);
      return { success: true, data, headers, totalRows, columnTypes };
      
    } catch (error) {
      console.error('CSV loading error:', error);
      return { success: false, error: error.message, data: [], headers: [] };
    }
  }

  // Get sample data for display
  getSample(data, sampleSize = 10) {
    return data.slice(0, sampleSize);
  }

  // Get column information
  getColumnInfo(data) {
    if (data.length === 0) return {};
    
    const info = {};
    const sample = data[0];
    
    Object.keys(sample).forEach(column => {
      info[column] = {
        type: this.inferColumnType(data, column),
        sampleValues: data.slice(0, 5).map(row => row[column])
      };
    });
    
    return info;
  }

  // Infer column type from sample data
  inferColumnType(data, column) {
    const sample = data.slice(0, 100).map(row => row[column]).filter(val => val !== '');
    
    if (sample.length === 0) return 'text';
    
    const numericCount = sample.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).length;
    const dateCount = sample.filter(val => !isNaN(Date.parse(val))).length;
    
    if (numericCount / sample.length > 0.8) return 'numeric';
    if (dateCount / sample.length > 0.8) return 'date';
    
    return 'text';
  }
}

// Export singleton instance
export const csvLoader = new CSVLoader();