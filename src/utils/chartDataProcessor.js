/**
 * Chart data processing utilities
 */

export class ChartDataProcessor {
  /**
   * Validate chart configuration
   */
  static validateConfig(data, config) {
    const errors = [];
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      errors.push('No data available for chart');
      return { valid: false, errors };
    }
    
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    // Basic validation
    if (!config.chartType) {
      errors.push('Chart type is required');
    }
    
    // Chart-specific validation
    switch (config.chartType) {
      case 'pie':
        if (!config.xAxis) errors.push('Category column is required for pie charts');
        if (!config.yAxis) errors.push('Value column is required for pie charts');
        if (config.yAxis && columns.includes(config.yAxis)) {
          const hasNumericData = this.validateNumericColumn(data, config.yAxis);
          if (!hasNumericData) {
            errors.push(`Value column "${config.yAxis}" must contain numeric data`);
          }
        }
        break;
        
      case 'heatmap':
        if (!config.xAxis) errors.push('X-axis column is required for heatmaps');
        if (!config.yAxis) errors.push('Y-axis column is required for heatmaps');
        if (!config.zAxis) errors.push('Value column is required for heatmaps');
        if (config.zAxis && columns.includes(config.zAxis)) {
          const hasNumericData = this.validateNumericColumn(data, config.zAxis);
          if (!hasNumericData) {
            errors.push(`Value column "${config.zAxis}" must contain numeric data`);
          }
        }
        break;
        
      case 'scatter':
      case 'bubble':
        if (!config.xAxis) errors.push('X-axis column is required');
        if (!config.yAxis) errors.push('Y-axis column is required');
        if (config.chartType === 'bubble' && !config.zAxis) {
          errors.push('Size column is required for bubble charts');
        }
        
        // Validate numeric columns
        if (config.xAxis && columns.includes(config.xAxis)) {
          const hasNumericData = this.validateNumericColumn(data, config.xAxis);
          if (!hasNumericData) {
            errors.push(`X-axis column "${config.xAxis}" should contain numeric data`);
          }
        }
        if (config.yAxis && columns.includes(config.yAxis)) {
          const hasNumericData = this.validateNumericColumn(data, config.yAxis);
          if (!hasNumericData) {
            errors.push(`Y-axis column "${config.yAxis}" should contain numeric data`);
          }
        }
        break;
        
      default:
        // Standard charts (line, bar, column, area)
        if (!config.xAxis) errors.push('X-axis column is required');
        if (!config.yAxis) errors.push('Y-axis column is required');
        if (config.yAxis && columns.includes(config.yAxis)) {
          const hasNumericData = this.validateNumericColumn(data, config.yAxis);
          if (!hasNumericData) {
            errors.push(`Y-axis column "${config.yAxis}" should contain numeric data`);
          }
        }
        break;
    }
    
    // Check if columns exist
    ['xAxis', 'yAxis', 'zAxis', 'groupBy', 'colorBy', 'sizeBy'].forEach(field => {
      if (config[field] && !columns.includes(config[field])) {
        errors.push(`Column "${config[field]}" not found in data. Available: ${columns.join(', ')}`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate if column contains mostly numeric data
   */
  static validateNumericColumn(data, columnName) {
    const sampleSize = Math.min(100, data.length);
    const sample = data.slice(0, sampleSize);
    
    let numericCount = 0;
    for (const row of sample) {
      const value = parseFloat(row[columnName]);
      if (!isNaN(value) && isFinite(value)) {
        numericCount++;
      }
    }
    
    // At least 70% should be numeric
    return (numericCount / sampleSize) >= 0.7;
  }
  
  /**
   * Process raw data according to configuration
   */
  static processData(rawData, config) {
    if (!rawData || rawData.length === 0) return [];
    
    let data = [...rawData];
    
    try {
      // Apply filtering
      if (config.filterCondition) {
        data = this.applyFilter(data, config.filterCondition);
      }
      
      // Apply grouping and aggregation
      if (config.groupBy && config.aggregation && config.aggregation !== 'none') {
        data = this.applyGrouping(data, config);
      }
      
      // Apply sorting
      if (config.sortBy) {
        data = this.applySorting(data, config.sortBy, config.sortOrder);
      }
      
      // Apply limit
      if (config.limit && config.limit > 0) {
        data = data.slice(0, config.limit);
      }
      
      return data;
      
    } catch (error) {
      console.error('Error processing chart data:', error);
      return rawData.slice(0, 100); // Return first 100 rows as fallback
    }
  }
  
  /**
   * Apply basic filtering to data
   */
  static applyFilter(data, filterCondition) {
    if (!filterCondition || typeof filterCondition !== 'string') return data;
    
    try {
      // Simple filtering implementation
      // In a production app, you'd want a more sophisticated filter parser
      return data.filter(row => {
        // Basic condition parsing for common patterns like "column > value"
        const condition = filterCondition.trim();
        
        // Handle simple comparisons
        const comparisonMatch = condition.match(/(\w+)\s*([><=!]+)\s*(.+)/);
        if (comparisonMatch) {
          const [, column, operator, valueStr] = comparisonMatch;
          const value = isNaN(valueStr) ? valueStr.replace(/['"]/g, '') : parseFloat(valueStr);
          const rowValue = isNaN(row[column]) ? row[column] : parseFloat(row[column]);
          
          switch (operator) {
            case '>': return rowValue > value;
            case '<': return rowValue < value;
            case '>=': return rowValue >= value;
            case '<=': return rowValue <= value;
            case '=': 
            case '==': return rowValue == value;
            case '!=': return rowValue != value;
            default: return true;
          }
        }
        
        return true; // If can't parse, include the row
      });
    } catch (error) {
      console.warn('Filter parsing error:', error);
      return data; // Return unfiltered data on error
    }
  }
  
  /**
   * Apply grouping and aggregation to data
   */
  static applyGrouping(data, config) {
    const { groupBy, aggregation, yAxis } = config;
    
    if (!groupBy || !yAxis) return data;
    
    const grouped = {};
    
    // Group data
    data.forEach(row => {
      const groupKey = String(row[groupBy]);
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(row);
    });
    
    // Apply aggregation
    return Object.keys(grouped).map(groupKey => {
      const group = grouped[groupKey];
      const result = { [groupBy]: groupKey };
      
      const numericValues = group
        .map(row => parseFloat(row[yAxis]))
        .filter(val => !isNaN(val) && isFinite(val));
      
      if (numericValues.length === 0) {
        result[yAxis] = 0;
        return result;
      }
      
      switch (aggregation) {
        case 'sum':
          result[yAxis] = numericValues.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result[yAxis] = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
          break;
        case 'count':
          result[yAxis] = group.length;
          break;
        case 'min':
          result[yAxis] = Math.min(...numericValues);
          break;
        case 'max':
          result[yAxis] = Math.max(...numericValues);
          break;
        default:
          result[yAxis] = numericValues[0];
      }
      
      // Include first non-null values from other columns for context
      const firstRow = group[0];
      Object.keys(firstRow).forEach(key => {
        if (key !== groupBy && key !== yAxis && !(key in result)) {
          result[key] = firstRow[key];
        }
      });
      
      return result;
    });
  }
  
  /**
   * Apply sorting to data
   */
  static applySorting(data, sortBy, sortOrder = 'asc') {
    if (!sortBy) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Try to convert to numbers if possible
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        aVal = aNum;
        bVal = bNum;
      }
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  /**
   * Get summary statistics for a numeric column
   */
  static getColumnStats(data, columnName) {
    const values = data
      .map(row => parseFloat(row[columnName]))
      .filter(val => !isNaN(val) && isFinite(val));
      
    if (values.length === 0) {
      return { count: 0, min: null, max: null, avg: null, sum: null };
    }
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { count: values.length, min, max, avg, sum };
  }
  
  /**
   * Detect column types in data
   */
  static detectColumnTypes(data) {
    if (!data || data.length === 0 || !data[0]) return {};
    
    const columns = Object.keys(data[0]);
    const types = {};
    
    columns.forEach(column => {
      const sample = data.slice(0, Math.min(100, data.length));
      let numericCount = 0;
      let dateCount = 0;
      let stringCount = 0;
      
      sample.forEach(row => {
        const value = row[column];
        
        if (value === null || value === undefined || value === '') {
          return; // Skip null/empty values
        }
        
        // Check if numeric
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          numericCount++;
          return;
        }
        
        // Check if date
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime()) && String(value).length > 4) {
          dateCount++;
          return;
        }
        
        stringCount++;
      });
      
      // Determine type based on majority
      const total = numericCount + dateCount + stringCount;
      if (total === 0) {
        types[column] = 'unknown';
      } else if (numericCount / total > 0.7) {
        types[column] = 'numeric';
      } else if (dateCount / total > 0.7) {
        types[column] = 'date';
      } else {
        types[column] = 'string';
      }
    });
    
    return types;
  }
  
  /**
   * Get recommended chart types based on data characteristics
   */
  static getRecommendedChartTypes(data, xAxis, yAxis, zAxis = null) {
    if (!data || data.length === 0) return [];
    
    const columnTypes = this.detectColumnTypes(data);
    const recommendations = [];
    
    const xType = columnTypes[xAxis];
    const yType = columnTypes[yAxis];
    const zType = zAxis ? columnTypes[zAxis] : null;
    
    // Basic recommendations based on column types
    if (xType === 'string' && yType === 'numeric') {
      recommendations.push(
        { type: 'column', score: 0.9, reason: 'Categorical X-axis with numeric Y-axis' },
        { type: 'bar', score: 0.8, reason: 'Good for comparing categories' },
        { type: 'pie', score: 0.6, reason: 'Good for showing proportions' }
      );
    }
    
    if (xType === 'date' && yType === 'numeric') {
      recommendations.push(
        { type: 'line', score: 0.9, reason: 'Time series data' },
        { type: 'area', score: 0.8, reason: 'Time series with emphasis on volume' }
      );
    }
    
    if (xType === 'numeric' && yType === 'numeric') {
      recommendations.push(
        { type: 'scatter', score: 0.9, reason: 'Numeric vs numeric relationship' }
      );
      
      if (zType === 'numeric') {
        recommendations.push(
          { type: 'bubble', score: 0.8, reason: 'Three-dimensional numeric data' }
        );
      }
    }
    
    if (xType === 'string' && yType === 'string' && zType === 'numeric') {
      recommendations.push(
        { type: 'heatmap', score: 0.9, reason: 'Two categorical dimensions with numeric values' }
      );
    }
    
    // Sort by score
    return recommendations.sort((a, b) => b.score - a.score);
  }
}