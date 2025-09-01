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