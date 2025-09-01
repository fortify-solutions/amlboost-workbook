import React, { useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { getOpenAIService } from '../../services/openaiService';

export function AddStateModal() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { addState } = state.modals;
  const [newState, setNewState] = useState({
    name: '',
    description: '',
    computationType: 'window_sum',
    field: 'charged_amount',
    condition: '',
    windowDays: 7,
    groupBy: 'merchant_id',
    persistent: false
  });
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const handleClose = () => {
    dispatch({
      type: ActionTypes.TOGGLE_MODAL,
      payload: { modal: 'addState', value: { open: false, cellId: null } }
    });
    setNewState({
      name: '',
      description: '',
      computationType: 'window_sum',
      field: 'charged_amount',
      condition: '',
      windowDays: 7,
      groupBy: 'merchant_id',
      persistent: false
    });
    setShowAIHelper(false);
    setAiPrompt('');
  };

  const handleAIGeneration = async () => {
    if (!aiPrompt.trim()) return;

    setIsProcessingAI(true);
    
    try {
      // Get OpenAI service with data context
      const openaiService = getOpenAIService(state.csvData, state.columnTypes);
      
      // Get available columns for context
      const availableColumns = state.csvData.length > 0 ? Object.keys(state.csvData[0]) : [];
      
      // Create AI request for state definition
      const response = await openaiService.generateStateDefinition(aiPrompt, availableColumns);
      
      // Parse the JSON response
      let stateConfig;
      try {
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        stateConfig = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        alert('AI returned invalid configuration format. Please try again.');
        return;
      }

      // Apply the AI-generated configuration
      setNewState({
        name: stateConfig.name || '',
        description: stateConfig.description || '',
        computationType: stateConfig.computationType || 'window_sum',
        field: stateConfig.field || 'charged_amount',
        condition: stateConfig.condition || '',
        windowDays: stateConfig.windowDays || 7,
        groupBy: stateConfig.groupBy || '',
        persistent: stateConfig.persistent || false
      });

      // Hide AI helper and show success
      setShowAIHelper(false);
      setAiPrompt('');
      
    } catch (error) {
      console.error('AI state generation failed:', error);
      alert(`AI generation failed: ${error.message}`);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const generateStateQuery = (computationType, field, condition, windowDays, groupBy) => {
    // Fix field reference for count operations
    const actualField = field === '*' ? '*' : field;
    
    switch (computationType) {
      case 'window_sum':
        // SQLite window function with ROWS instead of RANGE BETWEEN INTERVAL
        if (groupBy) {
          return `SUM(${actualField}) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
        }
        return `SUM(${actualField}) OVER (ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
      
      case 'window_avg':
        if (groupBy) {
          return `AVG(${actualField}) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
        }
        return `AVG(${actualField}) OVER (ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
      
      case 'window_count':
        if (groupBy) {
          return `COUNT(*) OVER (PARTITION BY ${groupBy} ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
        }
        return `COUNT(*) OVER (ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW)`;
      
      case 'aggregate_sum':
        // For aggregates, use correlated subquery that returns single value per row
        // If field is '*', use COUNT instead of SUM
        const sumFunction = actualField === '*' ? 'COUNT(*)' : `SUM(${actualField})`;
        if (groupBy) {
          return `(SELECT ${sumFunction} FROM transactions t2 WHERE t2.${groupBy} = transactions.${groupBy}${condition ? ' AND ' + condition : ''})`;
        }
        return `(SELECT ${sumFunction} FROM transactions t2${condition ? ' WHERE ' + condition : ''})`;
      
      case 'aggregate_count':
        if (groupBy) {
          return `(SELECT COUNT(*) FROM transactions t2 WHERE t2.${groupBy} = transactions.${groupBy}${condition ? ' AND ' + condition : ''})`;
        }
        return `(SELECT COUNT(*) FROM transactions t2${condition ? ' WHERE ' + condition : ''})`;
      
      case 'risk_score':
        return `CASE 
          WHEN COUNT(CASE WHEN decline = 1 THEN 1 END) OVER (PARTITION BY user_id ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW) > 2 THEN 'HIGH'
          WHEN COUNT(CASE WHEN decline = 1 THEN 1 END) OVER (PARTITION BY user_id ORDER BY txn_date_time ROWS BETWEEN ${windowDays * 10} PRECEDING AND CURRENT ROW) > 0 THEN 'MEDIUM'
          ELSE 'LOW'
        END`;
      
      default:
        return `SUM(${actualField}) OVER (ORDER BY txn_date_time)`;
    }
  };

  const handleSaveState = async () => {
    if (!newState.name.trim()) {
      alert('Please provide a state name');
      return;
    }

    const stateObj = {
      name: newState.name,
      description: newState.description,
      query: generateStateQuery(newState.computationType, newState.field, newState.condition, newState.windowDays, newState.groupBy),
      computationType: newState.computationType,
      field: newState.field,
      condition: newState.condition,
      windowDays: newState.windowDays,
      groupBy: newState.groupBy,
      persistent: newState.persistent
    };

    // Find the target state cell and add the new state to it
    const targetCell = state.cells.find(c => c.id === addState.cellId && c.type === 'state');
    if (targetCell) {
      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: addState.cellId,
          updates: {
            states: [...targetCell.states, stateObj]
          }
        }
      });

      // If persistent is checked, automatically compute and persist the state
      if (newState.persistent) {
        try {
          // Import the SQLite engine
          const { sqliteEngine } = await import('../../services/sqliteEngine');
          
          // Compute the state values using SQL
          const computeQuery = `
            SELECT *, 
                   (${stateObj.query}) as ${stateObj.name}
            FROM transactions 
            ORDER BY rowid
          `;
          
          const result = sqliteEngine.execute(computeQuery);
          
          if (result.success) {
            // Update the CSV data with the computed values
            dispatch({
              type: ActionTypes.SET_CSV_DATA,
              payload: result.data
            });
            
            // Update the SQLite database with the new column
            await sqliteEngine.setData(result.data);
            
            alert(`State "${stateObj.name}" has been computed and persisted to the dataset.`);
          } else {
            alert(`Error computing state: ${result.error}`);
          }
        } catch (error) {
          console.error('Error persisting state:', error);
          alert(`Error persisting state: ${error.message}`);
        }
      }
    }

    handleClose();
  };

  if (!addState.open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-[520px] max-w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900">Add Computed State</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowAIHelper(!showAIHelper)}
              className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
            >
              <Icon name="Sparkles" className="w-3 h-3" />
              <span>AI Assist</span>
            </button>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* AI Helper Panel */}
            {showAIHelper && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-purple-900">AI State Generator</h4>
                  <button 
                    onClick={() => setShowAIHelper(false)}
                    className="text-purple-400 hover:text-purple-600"
                  >
                    <Icon name="X" className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-purple-700 mb-3">
                  Describe the computed state you want to create in plain English, and AI will configure it for you.
                </p>
                
                <div className="mb-3">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full h-20 p-3 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="e.g., Calculate the total amount spent by each user in the last 30 days"
                    disabled={isProcessingAI}
                  />
                </div>
                
                <div className="mb-3 text-xs text-purple-600">
                  <div className="font-medium mb-1">Example requests:</div>
                  <div className="space-y-1">
                    <div className="bg-purple-100 px-2 py-1 rounded">• "Count how many transactions each user made in the last 7 days"</div>
                    <div className="bg-purple-100 px-2 py-1 rounded">• "Calculate average transaction amount per merchant over time"</div>
                    <div className="bg-purple-100 px-2 py-1 rounded">• "Create a risk score based on declined transactions"</div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleAIGeneration}
                    disabled={!aiPrompt.trim() || isProcessingAI}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isProcessingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="Sparkles" className="w-3 h-3" />
                        <span>Generate State</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State Name *</label>
              <input
                type="text"
                value={newState.name}
                onChange={(e) => setNewState({...newState, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., user_fraud_risk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newState.description}
                onChange={(e) => setNewState({...newState, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Brief description of what this state represents"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Computation Type</label>
              <select
                value={newState.computationType}
                onChange={(e) => setNewState({...newState, computationType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="window_sum">Rolling Window Sum</option>
                <option value="window_avg">Rolling Window Average</option>
                <option value="window_count">Rolling Window Count</option>
                <option value="aggregate_sum">Aggregate Sum</option>
                <option value="aggregate_count">Aggregate Count</option>
                <option value="risk_score">Risk Score</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                <select
                  value={newState.field}
                  onChange={(e) => setNewState({...newState, field: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="charged_amount">charged_amount</option>
                  <option value="decline">decline</option>
                  <option value="fraud">fraud</option>
                  <option value="*">* (count all)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={newState.groupBy}
                  onChange={(e) => setNewState({...newState, groupBy: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None</option>
                  <option value="user_id">user_id</option>
                  <option value="merchant_id">merchant_id</option>
                  <option value="merchant_country">merchant_country</option>
                  <option value="outcome">outcome</option>
                </select>
              </div>
            </div>

            {newState.computationType.startsWith('window_') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Window Days</label>
                <input
                  type="number"
                  value={newState.windowDays}
                  onChange={(e) => setNewState({...newState, windowDays: parseInt(e.target.value) || 7})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Condition (optional)</label>
              <input
                type="text"
                value={newState.condition}
                onChange={(e) => setNewState({...newState, condition: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., fraud = 1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="persistent"
                checked={newState.persistent}
                onChange={(e) => setNewState({...newState, persistent: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="persistent" className="text-sm text-gray-700">
                Persist to dataset (add as new column)
              </label>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Generated Query:</div>
              <div className="bg-white rounded border p-3 font-mono text-xs text-gray-600">
                {generateStateQuery(newState.computationType, newState.field, newState.condition, newState.windowDays, newState.groupBy)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveState}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Icon name="Plus" className="w-4 h-4" />
            <span>Add State</span>
          </button>
        </div>
      </div>
    </div>
  );
}