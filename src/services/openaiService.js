export class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.dataSchema = null;
    this.columnTypes = {};
  }
  
  // Set schema information for better AI context
  setDataContext(data, columnTypes) {
    this.columnTypes = columnTypes || {};
    if (data && data.length > 0) {
      this.dataSchema = this.buildSchemaInfo(data);
    }
  }
  
  // Build comprehensive schema information
  buildSchemaInfo(data) {
    const columns = Object.keys(data[0]);
    const schemaInfo = {};
    
    columns.forEach(column => {
      const columnType = this.columnTypes[column] || 'text';
      const sampleValues = data.slice(0, 10).map(row => row[column]).filter(val => val !== null && val !== '');
      const uniqueValues = [...new Set(data.slice(0, 100).map(row => row[column]))];
      
      schemaInfo[column] = {
        type: columnType,
        sampleValues: sampleValues.slice(0, 3),
        uniqueCount: Math.min(uniqueValues.length, 100),
        hasNulls: data.some(row => !row[column] || row[column] === '')
      };
    });
    
    return schemaInfo;
  }

  async sendMessage(messages, cellContext = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Build system message with context if provided
    const systemMessage = {
      role: 'system',
      content: this.buildSystemPrompt(cellContext)
    };

    const requestBody = {
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  buildSystemPrompt(cellContext) {
    let systemPrompt = `You are an AI assistant helping with transaction data analysis in a Jupyter-like notebook environment.`;

    // Add detailed schema information if available
    if (this.dataSchema) {
      systemPrompt += `\n\nYou have access to a dataset of financial transactions with the following detailed structure:\n\n`;
      
      Object.entries(this.dataSchema).forEach(([column, info]) => {
        systemPrompt += `• ${column} (${info.type}): `;
        
        // Add column descriptions based on common patterns
        const descriptions = {
          'user_id': 'Unique identifier for users',
          'txn_date_time': 'Transaction timestamp',
          'transaction_id': 'Unique transaction identifier', 
          'action': 'Transaction action type',
          'type': 'Payment method type',
          'orig_currency': 'Original currency code',
          'charged_currency': 'Charged currency code',
          'charged_amount': 'Transaction amount',
          'decline_reason': 'Reason for declined transactions',
          'merchant_id': 'Merchant identifier',
          'terminal_id': 'Payment terminal identifier',
          'merchant_city': 'Merchant location',
          'mcc': 'Merchant Category Code',
          'merchant_country': 'Merchant country',
          'merchant_name': 'Merchant business name',
          'three_ds': '3D Secure authentication flag',
          '_wallet': 'Digital wallet type',
          'processor_code': 'Payment processor code',
          'is_recurring': 'Recurring payment flag',
          'fraud': 'Fraud indicator (Yes=fraud, No=legitimate)',
          'decline': 'Decline flag (1=declined, 0=approved)',
          'outcome': 'Transaction outcome code (TN=successful)'
        };
        
        systemPrompt += descriptions[column] || 'Data field';
        
        if (info.sampleValues.length > 0) {
          systemPrompt += `. Sample values: ${info.sampleValues.map(v => `"${v}"`).join(', ')}`;
        }
        
        if (info.uniqueCount <= 20) {
          systemPrompt += ` (${info.uniqueCount} unique values)`;
        }
        
        systemPrompt += '\n';
      });
      
      systemPrompt += `\nIMPORTANT SQL Guidelines:
- The table name is "transactions"
- Use exact column names as shown above
- For boolean fields (fraud, decline, is_recurring, three_ds): use 1 for true, 0 for false
- For dates: use DATE() function for date-only queries, or direct comparison for datetime
- Popular outcomes: 'TN' = successful, others indicate various failure reasons
- Use appropriate data types in your queries based on the column types above`;
    } else {
      // Fallback if schema not available
      systemPrompt += `\n\nYou have access to a dataset of financial transactions. When writing SQL queries, use the table name "transactions" and ask the user for specific column names if you're unsure.`;
    }

    systemPrompt += `\n\nYou should provide helpful insights, suggest SQL queries, explain patterns in the data, and help with analysis. Be concise but informative. When suggesting SQL queries, make them practical and focused on the user's specific request.`;

    if (cellContext && cellContext.length > 0) {
      systemPrompt += '\n\nContext from previous cells in this notebook:\n';
      
      cellContext.forEach((cell, index) => {
        if (cell.type === 'markdown') {
          systemPrompt += `\nMarkdown Cell ${cell.id}: ${cell.title || 'Untitled'}\n${cell.content}\n`;
        } else if (cell.type === 'data') {
          systemPrompt += `\nData Cell ${cell.id}: ${cell.title}\nQuery: ${cell.query}\n`;
          if (cell.queryResults && cell.queryResults.length > 0) {
            const sampleRows = cell.queryResults.slice(0, 3);
            systemPrompt += `Sample Results (${cell.queryResults.length} total rows):\n${JSON.stringify(sampleRows, null, 2)}\n`;
          }
        } else if (cell.type === 'chart') {
          systemPrompt += `\nChart Cell ${cell.id}: ${cell.title}\nChart Type: ${cell.chartType}\nQuery: ${cell.query}\n`;
        } else if (cell.type === 'state') {
          systemPrompt += `\nState Cell ${cell.id}: ${cell.title}\n`;
          cell.states.forEach(state => {
            systemPrompt += `- State: ${state.name} - ${state.description}\n  Query: ${state.query}\n`;
          });
        }
      });
      
      systemPrompt += '\nUse this context to provide relevant and specific help with the user\'s questions about their data analysis.';
    }

    return systemPrompt;
  }

  // Build specialized system prompt for chart configuration
  buildChartSystemPrompt(availableColumns, cellContext) {
    let systemPrompt = `You are an AI assistant specialized in creating chart configurations for financial transaction data analysis.`;

    // Add detailed schema information if available
    if (this.dataSchema) {
      systemPrompt += `\n\nYou have access to a dataset of financial transactions with the following structure:\n\n`;
      
      Object.entries(this.dataSchema).forEach(([column, info]) => {
        systemPrompt += `• ${column} (${info.type}): `;
        
        // Add column descriptions based on common patterns
        const descriptions = {
          'user_id': 'Unique identifier for users',
          'txn_date_time': 'Transaction timestamp - ideal for time series',
          'transaction_id': 'Unique transaction identifier', 
          'action': 'Transaction action type',
          'type': 'Payment method type',
          'orig_currency': 'Original currency code',
          'charged_currency': 'Charged currency code',
          'charged_amount': 'Transaction amount - numeric, good for Y-axis',
          'decline_reason': 'Reason for declined transactions',
          'merchant_id': 'Merchant identifier',
          'terminal_id': 'Payment terminal identifier',
          'merchant_city': 'Merchant location - categorical',
          'mcc': 'Merchant Category Code - categorical',
          'merchant_country': 'Merchant country - good for grouping/X-axis',
          'merchant_name': 'Merchant business name - categorical',
          'three_ds': '3D Secure authentication flag - binary',
          '_wallet': 'Digital wallet type - categorical',
          'processor_code': 'Payment processor code',
          'is_recurring': 'Recurring payment flag - binary',
          'fraud': 'Fraud indicator (Yes/No or 1/0) - good for pie charts',
          'decline': 'Decline flag (1/0) - binary for analysis',
          'outcome': 'Transaction outcome code - categorical'
        };
        
        systemPrompt += descriptions[column] || 'Data field';
        
        if (info.sampleValues.length > 0) {
          systemPrompt += `. Sample values: ${info.sampleValues.map(v => `"${v}"`).join(', ')}`;
        }
        
        systemPrompt += '\n';
      });
      
      systemPrompt += `\nChart Configuration Guidelines:
- For TIME SERIES: Use txn_date_time as X-axis, numeric columns like charged_amount as Y-axis, chart type: line/area
- For COMPARISONS: Use categorical columns (merchant_country, merchant_name) as X-axis, numeric aggregations as Y-axis, chart type: bar/column
- For DISTRIBUTIONS: Use categorical columns for both category and value, chart type: pie
- For CORRELATIONS: Use two numeric columns, chart type: scatter/bubble
- For PATTERNS: Use two categorical columns with numeric value, chart type: heatmap
- AGGREGATION: Use "sum" for amounts, "count" for transaction frequency, "avg" for averages
- GROUPING: Group by categorical fields to aggregate data meaningfully`;
    } else {
      // Fallback if schema not available
      systemPrompt += `\n\nYou have access to financial transaction data. Available columns: ${availableColumns.join(', ')}.
      
Choose appropriate chart types:
- Line/Area charts for time series data
- Bar/Column charts for categorical comparisons
- Pie charts for distribution analysis
- Scatter plots for correlations
- Heatmaps for pattern analysis`;
    }

    systemPrompt += `\n\nYou must respond with valid JSON only. Example response:
{
  "title": "Revenue by Merchant Country",
  "chartType": "bar",
  "xAxis": "merchant_country",
  "yAxis": "charged_amount",
  "groupBy": "merchant_country",
  "aggregation": "sum",
  "dataSource": "csv",
  "reasoning": "Bar chart best shows revenue comparison across countries with sum aggregation"
}

IMPORTANT: Only use column names that exist in the available columns: ${availableColumns.join(', ')}`;

    if (cellContext && cellContext.length > 0) {
      systemPrompt += '\n\nContext from previous cells in this notebook:\n';
      
      cellContext.forEach((cell, index) => {
        if (cell.type === 'data' && cell.queryResults && cell.queryResults.length > 0) {
          systemPrompt += `\nData Cell ${cell.id}: ${cell.title}\nColumns available: ${Object.keys(cell.queryResults[0]).join(', ')}\n`;
        }
      });
      
      systemPrompt += '\nConsider this context when choosing chart configurations.';
    }

    return systemPrompt;
  }

  // Specialized method for chart configuration
  async generateChartConfiguration(prompt, availableColumns, cellContext = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Build specialized system message for chart configuration
    const systemMessage = {
      role: 'system',
      content: this.buildChartSystemPrompt(availableColumns, cellContext)
    };

    // Create user message with structured prompt
    const userMessage = {
      role: 'user',
      content: `Configure a chart for this request: "${prompt}"
      
Available columns: ${availableColumns.join(', ')}

Respond with a JSON object containing:
{
  "title": "Descriptive chart title",
  "chartType": "line|bar|column|area|pie|scatter|bubble|heatmap",
  "xAxis": "column_name_for_x_axis",
  "yAxis": "column_name_for_y_axis",
  "zAxis": "column_name_for_z_axis_if_needed",
  "groupBy": "column_to_group_by_if_needed",
  "aggregation": "none|sum|avg|count|min|max",
  "dataSource": "csv",
  "reasoning": "Brief explanation of choices"
}

Only include fields that are necessary. Respond with JSON only.`
    };

    const requestBody = {
      model: 'gpt-4',
      messages: [systemMessage, userMessage],
      temperature: 0.3, // Lower temperature for more consistent JSON output
      max_tokens: 500
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI Chart Configuration Error:', error);
      throw error;
    }
  }

  // Specialized method for state definition generation
  async generateStateDefinition(prompt, availableColumns, cellContext = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Build specialized system message for state generation
    const systemMessage = {
      role: 'system',
      content: this.buildStateSystemPrompt(availableColumns, cellContext)
    };

    // Create user message with structured prompt
    const userMessage = {
      role: 'user',
      content: `Create a computed state definition for this request: "${prompt}"
      
Available columns: ${availableColumns.join(', ')}

Respond with a JSON object containing:
{
  "name": "state_variable_name",
  "description": "Brief description of what this computes",
  "computationType": "window_sum|window_avg|window_count|aggregate_sum|aggregate_count|risk_score",
  "field": "column_name_to_compute_on",
  "condition": "optional_sql_condition",
  "windowDays": 7,
  "groupBy": "column_to_group_by_if_needed",
  "persistent": false,
  "reasoning": "Brief explanation of choices"
}

Respond with JSON only.`
    };

    const requestBody = {
      model: 'gpt-4',
      messages: [systemMessage, userMessage],
      temperature: 0.3,
      max_tokens: 600
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI State Definition Error:', error);
      throw error;
    }
  }

  // Build specialized system prompt for state definition
  buildStateSystemPrompt(availableColumns, cellContext) {
    let systemPrompt = `You are an AI assistant specialized in creating computed state definitions for financial transaction data analysis.`;

    // Add detailed schema information if available
    if (this.dataSchema) {
      systemPrompt += `\n\nYou have access to a dataset of financial transactions with the following structure:\n\n`;
      
      Object.entries(this.dataSchema).forEach(([column, info]) => {
        systemPrompt += `• ${column} (${info.type}): `;
        
        // Add column descriptions with state generation context
        const descriptions = {
          'user_id': 'User identifier - good for groupBy in user-level states',
          'txn_date_time': 'Transaction timestamp - essential for time-based windows',
          'transaction_id': 'Unique transaction identifier',
          'charged_amount': 'Transaction amount - primary field for sum/avg computations',
          'decline': 'Decline flag (1/0) - good for risk scoring',
          'merchant_id': 'Merchant identifier - useful for merchant-level grouping',
          'merchant_country': 'Merchant country - useful for geographic analysis',
          'merchant_name': 'Merchant name - for merchant-specific states',
          'fraud': 'Fraud indicator - essential for risk calculations',
          'outcome': 'Transaction outcome - useful for success rate calculations',
          'mcc': 'Merchant Category Code - for industry analysis',
          'payment_method': 'Payment method type - for method-specific states'
        };
        
        systemPrompt += descriptions[column] || 'Data field';
        
        if (info.sampleValues.length > 0) {
          systemPrompt += `. Sample values: ${info.sampleValues.map(v => `"${v}"`).join(', ')}`;
        }
        
        systemPrompt += '\n';
      });
      
      systemPrompt += `\nState Computation Guidelines:
- WINDOW FUNCTIONS: Use for rolling calculations (e.g., "last 7 days", "over time")
  - window_sum: Rolling sum of amounts
  - window_avg: Rolling average of values  
  - window_count: Rolling count of transactions
  - windowDays: Number of days to look back

- AGGREGATE FUNCTIONS: Use for total calculations across groups
  - aggregate_sum: Total sum for a group
  - aggregate_count: Total count for a group
  - No windowDays needed

- GROUPING: Choose appropriate groupBy field
  - user_id: For per-user calculations
  - merchant_id: For per-merchant calculations
  - merchant_country: For geographic analysis
  - Leave empty for overall totals

- RISK SCORING: Use risk_score type for fraud/decline patterns
  - Automatically considers decline patterns
  - Groups by user_id typically

- FIELD SELECTION: Choose the right field to compute on
  - charged_amount: For monetary calculations
  - fraud/decline: For binary risk calculations
  - "*": For counting all transactions

- CONDITIONS: Add SQL conditions to filter data
  - "fraud = 1": Only fraudulent transactions
  - "charged_amount > 100": Only high-value transactions`;
    } else {
      // Fallback if schema not available
      systemPrompt += `\n\nYou have access to financial transaction data with columns: ${availableColumns.join(', ')}.
      
Key computation types:
- window_sum/window_avg/window_count: For rolling time-based calculations
- aggregate_sum/aggregate_count: For total calculations across groups
- risk_score: For fraud/risk pattern detection`;
    }

    systemPrompt += `\n\nExample state definitions:

{
  "name": "user_30day_spending",
  "description": "Total amount spent by user in last 30 days",
  "computationType": "window_sum",
  "field": "charged_amount",
  "windowDays": 30,
  "groupBy": "user_id",
  "persistent": false
}

{
  "name": "user_fraud_risk",
  "description": "Risk score based on decline patterns",
  "computationType": "risk_score",
  "field": "decline",
  "windowDays": 7,
  "groupBy": "user_id",
  "persistent": false
}

IMPORTANT: Only use column names that exist in the available columns: ${availableColumns.join(', ')}`;

    if (cellContext && cellContext.length > 0) {
      systemPrompt += '\n\nContext from previous cells in this notebook:\n';
      
      cellContext.forEach((cell, index) => {
        if (cell.type === 'data' && cell.queryResults && cell.queryResults.length > 0) {
          systemPrompt += `\nData Cell ${cell.id}: ${cell.title}\nColumns available: ${Object.keys(cell.queryResults[0]).join(', ')}\n`;
        }
      });
      
      systemPrompt += '\nConsider this context when creating state definitions.';
    }

    return systemPrompt;
  }
}

// Utility function to get OpenAI service instance with data context
export function getOpenAIService(data = null, columnTypes = null) {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('No OpenAI API key found. Please configure your API key in Settings.');
  }
  
  const service = new OpenAIService(apiKey);
  
  // Set data context if provided
  if (data && columnTypes) {
    service.setDataContext(data, columnTypes);
  }
  
  return service;
}