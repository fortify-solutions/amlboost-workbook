import React, { useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { getOpenAIService } from '../../services/openaiService';

export function AIAssistModal() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { aiAssist } = state.modals;
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get the target cell to determine the mode
  const targetCell = state.cells.find(c => c.id === aiAssist.cellId);
  const isChartMode = targetCell?.type === 'chart';

  const handleClose = () => {
    dispatch({
      type: ActionTypes.TOGGLE_MODAL,
      payload: { modal: 'aiAssist', value: { open: false, cellId: null } }
    });
    setAiPrompt('');
  };

  const handleChartConfiguration = async (cellId, prompt) => {
    try {
      // Get OpenAI service with data context
      const openaiService = getOpenAIService(state.csvData, state.columnTypes);
      
      // Get available columns for context
      const availableColumns = state.csvData.length > 0 ? Object.keys(state.csvData[0]) : [];
      
      // Get previous cells as context
      const cellContext = state.cells.slice(0, state.cells.findIndex(c => c.id === cellId));
      
      // Use the specialized chart configuration method
      const response = await openaiService.generateChartConfiguration(prompt, availableColumns, cellContext);
      
      // Parse the JSON response
      let chartConfig;
      try {
        // Clean response and extract JSON
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        chartConfig = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('AI returned invalid chart configuration format');
      }

      // Validate the configuration
      if (!chartConfig.chartType || !chartConfig.xAxis || !chartConfig.yAxis) {
        throw new Error('AI response missing required chart configuration fields');
      }

      // Update the target cell with the generated configuration
      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: cellId,
          updates: {
            title: chartConfig.title || 'AI Generated Chart',
            chartType: chartConfig.chartType,
            dataSource: chartConfig.dataSource || 'csv',
            xAxis: chartConfig.xAxis,
            yAxis: chartConfig.yAxis,
            zAxis: chartConfig.zAxis || '',
            groupBy: chartConfig.groupBy || '',
            aggregation: chartConfig.aggregation || 'none',
            executed: false,
            // Store reasoning for user reference
            aiReasoning: chartConfig.reasoning
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Chart configuration failed:', error);
      throw error;
    }
  };

  const handleSQLGeneration = async (cellId, prompt) => {
    try {
      // Get OpenAI service with data context
      const openaiService = getOpenAIService(state.csvData, state.columnTypes);
      
      // Create AI request for SQL query generation
      const aiPrompt = `Generate a SQL query for this request: "${prompt}"
      
Please provide only the SQL query without explanation. The query should be practical and executable.`;

      // Get previous cells as context
      const cellContext = state.cells.slice(0, state.cells.findIndex(c => c.id === cellId));
      
      // Send request to AI
      const response = await openaiService.sendMessage(
        [{ role: 'user', content: aiPrompt }],
        cellContext
      );
      
      // Extract SQL query from response (remove markdown formatting if present)
      const generatedQuery = response.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

      // Generate a title based on the prompt
      const prompt_lower = prompt.toLowerCase();
      let generatedTitle = '';
      if (prompt_lower.includes('fraud')) {
        generatedTitle = 'Fraud Pattern Analysis';
      } else if (prompt_lower.includes('revenue') || prompt_lower.includes('amount')) {
        generatedTitle = 'Revenue Analysis';
      } else if (prompt_lower.includes('merchant')) {
        generatedTitle = 'Merchant Performance';
      } else if (prompt_lower.includes('time')) {
        generatedTitle = 'Temporal Analysis';
      } else if (prompt_lower.includes('country') || prompt_lower.includes('location')) {
        generatedTitle = 'Geographic Analysis';
      } else {
        generatedTitle = 'AI Generated Query';
      }

      // Update the target cell with the generated query
      const updates = {
        query: generatedQuery,
        title: generatedTitle,
        executed: false,
        queryResults: [],
        queryError: null
      };

      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: cellId,
          updates
        }
      });

      return true;
    } catch (error) {
      console.error('SQL generation failed:', error);
      throw error;
    }
  };

  const handleAiAssist = async (cellId, prompt) => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    
    // Find the target cell
    const targetCell = state.cells.find(c => c.id === cellId);
    if (!targetCell) {
      setIsProcessing(false);
      return;
    }

    try {
      if (targetCell.type === 'chart') {
        await handleChartConfiguration(cellId, prompt);
      } else {
        await handleSQLGeneration(cellId, prompt);
      }

      setIsProcessing(false);
      handleClose();
      
    } catch (error) {
      console.error('AI assist failed:', error);
      setIsProcessing(false);
      // Could show error message to user here
    }
  };

  if (!aiAssist.open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[520px] max-w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isChartMode ? 'AI Assist - Natural Language to Chart' : 'AI Assist - Natural Language to SQL'}
          </h3>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Icon name={isChartMode ? "BarChart3" : "Brain"} className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">How it works:</p>
              <p className="mt-1">
                {isChartMode 
                  ? "Describe what kind of chart you want to create, and I'll configure it with the right settings for your transaction data."
                  : "Describe what you want to analyze in plain English, and I'll generate a SQL query for your transaction data."
                }
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isChartMode ? 'Chart Description' : 'Natural Language Query'}
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={isChartMode 
              ? "e.g., Create a bar chart showing total revenue by merchant country"
              : "e.g., Show me all high-value transactions over $1000 in the last month"
            }
            disabled={isProcessing}
          />
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">
            {isChartMode ? 'Example chart requests:' : 'Example queries:'}
          </div>
          <div className="space-y-1">
            {isChartMode ? (
              <>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Show me a line chart of transaction amounts over time"
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Create a pie chart showing the distribution of fraud vs legitimate transactions"
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Make a bar chart comparing revenue by different merchants"
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Show a scatter plot of transaction amounts vs merchant countries"
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Show me suspicious transactions that might be fraud"
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "What's our total revenue by day over the last month?"
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  • "Which merchants have the most transactions?"
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={() => handleAiAssist(aiAssist.cellId, aiPrompt)}
            disabled={!aiPrompt.trim() || isProcessing}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Icon name="Sparkles" className="w-4 h-4" />
                <span>{isChartMode ? 'Configure Chart' : 'Generate Query'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}