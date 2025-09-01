// Advanced computed states service with window functions
export class ComputedStatesService {
  constructor(sqlEngine) {
    this.sqlEngine = sqlEngine;
  }

  // Generate SQL for different computation types
  generateStateQuery(computationType, field, condition, windowDays, groupBy) {
    const baseCondition = condition ? ` AND ${condition}` : '';
    
    switch (computationType) {
      case 'window_sum':
        if (groupBy) {
          return `SUM(${field}) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
        }
        return `SUM(${field}) OVER (ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
      
      case 'window_avg':
        if (groupBy) {
          return `AVG(${field}) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
        }
        return `AVG(${field}) OVER (ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
      
      case 'window_count':
        if (groupBy) {
          return `COUNT(*) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
        }
        return `COUNT(*) OVER (ORDER BY txn_date_time RANGE BETWEEN INTERVAL ${windowDays || 7} DAY PRECEDING AND CURRENT ROW)`;
      
      case 'running_total':
        if (groupBy) {
          return `SUM(${field}) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time)`;
        }
        return `SUM(${field}) OVER (ORDER BY txn_date_time)`;
      
      case 'rank':
        if (groupBy) {
          return `RANK() OVER (PARTITION BY ${groupBy} ORDER BY ${field} DESC)`;
        }
        return `RANK() OVER (ORDER BY ${field} DESC)`;
      
      case 'lag':
        if (groupBy) {
          return `LAG(${field}, 1) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time)`;
        }
        return `LAG(${field}, 1) OVER (ORDER BY txn_date_time)`;
      
      case 'row_number':
        if (groupBy) {
          return `ROW_NUMBER() OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time)`;
        }
        return `ROW_NUMBER() OVER (ORDER BY txn_date_time)`;
      
      default:
        return 'COUNT(*) OVER ()';
    }
  }

  // Compute window-based values for dataset
  computeWindowValues(data, state) {
    const sortedData = [...data].sort((a, b) => new Date(a.txn_date_time) - new Date(b.txn_date_time));
    const computedValues = new Map();
    
    sortedData.forEach((row, index) => {
      let computedValue;
      const currentDate = new Date(row.txn_date_time);
      
      switch (state.computationType) {
        case 'window_sum':
        case 'window_avg':
        case 'window_count':
          // Calculate window-based values
          const windowStartDate = new Date(currentDate);
          windowStartDate.setDate(windowStartDate.getDate() - (state.windowDays || 7));
          
          let relevantRows = sortedData.filter(r => {
            const rowDate = new Date(r.txn_date_time);
            const matchesGroup = state.groupBy ? r[state.groupBy] === row[state.groupBy] : true;
            const inWindow = rowDate >= windowStartDate && rowDate <= currentDate;
            return matchesGroup && inWindow;
          });
          
          if (state.computationType === 'window_sum') {
            computedValue = relevantRows.reduce((sum, r) => sum + (parseFloat(r[state.field]) || 0), 0);
          } else if (state.computationType === 'window_avg') {
            const sum = relevantRows.reduce((sum, r) => sum + (parseFloat(r[state.field]) || 0), 0);
            computedValue = relevantRows.length > 0 ? sum / relevantRows.length : 0;
          } else if (state.computationType === 'window_count') {
            computedValue = relevantRows.length;
          }
          break;
          
        case 'running_total':
          // Calculate running total
          let runningRows = sortedData.slice(0, index + 1);
          if (state.groupBy) {
            runningRows = runningRows.filter(r => r[state.groupBy] === row[state.groupBy]);
          }
          computedValue = runningRows.reduce((sum, r) => sum + (parseFloat(r[state.field]) || 0), 0);
          break;
          
        case 'rank':
          // Calculate rank within group
          let rankRows = state.groupBy 
            ? sortedData.filter(r => r[state.groupBy] === row[state.groupBy])
            : sortedData;
          rankRows.sort((a, b) => (parseFloat(b[state.field]) || 0) - (parseFloat(a[state.field]) || 0));
          computedValue = rankRows.findIndex(r => r === row) + 1;
          break;
          
        case 'lag':
          // Get previous value in group
          let lagRows = state.groupBy 
            ? sortedData.filter(r => r[state.groupBy] === row[state.groupBy])
            : sortedData;
          const currentIndex = lagRows.indexOf(row);
          computedValue = currentIndex > 0 ? (parseFloat(lagRows[currentIndex - 1][state.field]) || 0) : null;
          break;
          
        case 'row_number':
          // Row number within group
          let rowNumRows = state.groupBy 
            ? sortedData.filter(r => r[state.groupBy] === row[state.groupBy])
            : sortedData;
          computedValue = rowNumRows.indexOf(row) + 1;
          break;
          
        default:
          computedValue = 0;
      }

      computedValues.set(row, computedValue);
    });

    return computedValues;
  }

  // Execute SQL-based state computation
  async executeStateQuery(data, state) {
    console.log('executeStateQuery called with state:', state.name, 'data rows:', data.length);
    
    if (!this.sqlEngine || !this.sqlEngine.isInitialized) {
      throw new Error('SQL engine not initialized');
    }

    // If the state has a direct SQL query (from sample investigations)
    if (state.query && state.query.startsWith('(SELECT')) {
      console.log('Processing SQL subquery state:', state.query);
      // This is a subquery - we need to execute it for each row
      const computedValues = new Map();
      
      // Process in smaller batches to avoid performance issues
      const batchSize = 100;
      for (let batchStart = 0; batchStart < data.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, data.length);
        console.log(`Processing batch ${batchStart} to ${batchEnd}`);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const row = data[i];
          
          // For merchant_country_risk, we want to calculate the average fraud rate for this country
          // The subquery should aggregate across all transactions for this country
          let contextualQuery;
          
          if (state.name === 'merchant_country_risk') {
            // Calculate fraud rate for the merchant country of this row
            contextualQuery = `SELECT AVG(CASE WHEN fraud = 1 THEN 1.0 ELSE 0.0 END) as fraud_rate FROM transactions WHERE merchant_country = '${row.merchant_country}'`;
          } else {
            // Default: replace placeholder references in the query
            contextualQuery = state.query
              .replace(/transactions\.user_id/g, `'${row.user_id}'`)
              .replace(/transactions\.merchant_id/g, `'${row.merchant_id}'`)
              .replace(/transactions\.merchant_country/g, `'${row.merchant_country}'`)
              .slice(1, -1); // Remove outer parentheses
          }
          
          // Execute the subquery
          const result = this.sqlEngine.execute(contextualQuery);
          
          if (result.success && result.data.length > 0) {
            const value = Object.values(result.data[0])[0];
            computedValues.set(row, value || 0);
          } else {
            console.warn(`Query failed for row ${i}:`, result.error);
            computedValues.set(row, 0);
          }
        }
      }
      
      console.log('Computed values for', computedValues.size, 'rows');
      return computedValues;
    } else {
      console.log('Using window functions approach for state:', state.name);
      // Use the existing window functions approach
      return this.computeWindowValues(data, state);
    }
  }

  // Persist computed state to dataset
  async persistStateToDataset(originalData, state) {
    const computedValues = await this.executeStateQuery(originalData, state);
    
    // Apply computed values to original data maintaining original order
    const updatedData = originalData.map(originalRow => ({
      ...originalRow,
      [state.name]: computedValues.get(originalRow) || 0
    }));
    
    // Debug: Sample computed values
    const sampleValues = Array.from(computedValues.values()).slice(0, 5);
    console.log(`Sample computed values for ${state.name}:`, sampleValues);
    console.log(`Unique values for ${state.name}:`, [...new Set(sampleValues)]);
    
    return updatedData;
  }

  // Validate state configuration
  validateState(state) {
    const errors = [];
    
    if (!state.name || state.name.trim() === '') {
      errors.push('State name is required');
    }
    
    if (!state.description || state.description.trim() === '') {
      errors.push('State description is required');
    }
    
    if (['window_sum', 'window_avg', 'running_total', 'rank', 'lag'].includes(state.computationType) && !state.field) {
      errors.push('Field is required for this computation type');
    }
    
    if (['window_sum', 'window_avg', 'window_count'].includes(state.computationType) && (!state.windowDays || state.windowDays < 1)) {
      errors.push('Window size must be at least 1 day');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Get available fields for computation
  getAvailableFields(data) {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).filter(field => {
      // Check if field contains numeric data
      const sample = data.slice(0, 10).map(row => row[field]).filter(val => val !== '');
      const numericCount = sample.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).length;
      return numericCount / sample.length > 0.5; // At least 50% numeric
    });
  }

  // Get available grouping fields
  getGroupingFields(data) {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).filter(field => {
      // Check cardinality - good for grouping if not too many unique values
      const unique = new Set(data.slice(0, 100).map(row => row[field]));
      return unique.size > 1 && unique.size < 50; // Between 1-50 unique values
    });
  }
}

// Export singleton instance (will be initialized with SQL engine later)
export let computedStatesService = null;

export function initializeComputedStatesService(sqlEngine) {
  computedStatesService = new ComputedStatesService(sqlEngine);
  return computedStatesService;
}