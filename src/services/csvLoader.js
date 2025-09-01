// CSV loading and parsing service
export class CSVLoader {
  
  // Load column types from configuration file
  async loadColumnTypes() {
    try {
      const response = await fetch('/data-types.json');
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

  // Load and parse CSV file
  async loadCSV(url, maxRows = 1000) {
    try {
      console.log('Loading CSV from:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('CSV text length:', text.length);
      const lines = text.trim().split('\n');
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const headers = this.parseCSVLine(lines[0]);
      const data = lines.slice(1, maxRows + 1).map(line => {
        const values = this.parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      // Load column types
      const columnTypes = await this.loadColumnTypes();
      
      return { success: true, data, headers, totalRows: lines.length - 1, columnTypes };
    } catch (error) {
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