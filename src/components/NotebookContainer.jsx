import React, { useState } from 'react';
import { useNotebook } from '../stores/NotebookContext';
import { useCSVLoader } from '../hooks/useCSVLoader';
import { Icon } from './ui/Icon';
import { AICell } from './cells/AICell';
import { CellHeader } from './cells/CellHeader';
import { DataCell } from './cells/DataCell';
import { ChartCell } from './cells/ChartCell';
import { AIAssistModal } from './modals/AIAssistModal';
import { AddStateModal } from './modals/AddStateModal';
import { EditStateModal } from './modals/EditStateModal';
import { SettingsModal } from './modals/SettingsModal';
import { SaveInvestigationModal } from './modals/SaveInvestigationModal';
import { AddCellMenu } from './cells/AddCellMenu';
import { parseMarkdown } from '../utils/markdownParser';


export function NotebookContainer() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { executeCell } = useCSVLoader();

  return (
    <div className="min-h-screen fortify-geometric-pattern">
      {/* Top Toolbar */}
      <div className="fortify-card border-b border-gray-200 px-6 py-4 mx-4 mt-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 fortify-gradient-bg rounded-lg flex items-center justify-center">
                <Icon name="BarChart3" className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl fortify-heading font-bold">
                Transaction Analysis Notebook
              </h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Auto-saved • {state.csvData.length} transactions loaded</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1">
              <Icon name="Play" className="w-4 h-4" />
              <span>Run All</span>
            </button>
            <button 
              onClick={() => dispatch({ type: ActionTypes.TOGGLE_MODAL, payload: { modal: 'saveInvestigation', value: true } })}
              className="fortify-button-primary text-sm flex items-center space-x-1"
            >
              <Icon name="Save" className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button 
              onClick={() => dispatch({ type: ActionTypes.SHOW_LANDING_SCREEN, payload: true })}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1"
            >
              <Icon name="Home" className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => dispatch({ type: ActionTypes.TOGGLE_MODAL, payload: { modal: 'settings', value: true } })}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1"
            >
              <Icon name="Settings" className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button className="fortify-button-secondary text-sm flex items-center space-x-1">
              <Icon name="Download" className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notebook Content */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="space-y-4">
          {state.cells.map((cell, index) => (
            <div key={cell.id}>
              <CellRenderer cell={cell} />
              {state.selectedCellId === cell.id && (
                <AddCellMenu afterId={cell.id} />
              )}
            </div>
          ))}
          
          <AddCellMenu />
        </div>
      </div>

      {/* Modals */}
      <AIAssistModal />
      <AddStateModal />
      <EditStateModal />
      <SettingsModal />
      <SaveInvestigationModal 
        isOpen={state.modals.saveInvestigation}
        onClose={() => dispatch({ type: ActionTypes.TOGGLE_MODAL, payload: { modal: 'saveInvestigation', value: false } })}
        currentInvestigation={state.currentInvestigation}
      />
    </div>
  );
}

function CellRenderer({ cell }) {
  const { executeCell } = useCSVLoader();
  
  switch (cell.type) {
    case 'markdown':
      return <MarkdownCell cell={cell} />;
    case 'data':
      return <DataCell cell={cell} executeCell={executeCell} />;
    case 'state':
      return <StateCell cell={cell} />;
    case 'chart':
      return <ChartCell cell={cell} />;
    case 'ai':
      return <AICell cell={cell} />;
    default:
      return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <p className="text-gray-500">Unknown cell type: {cell.type}</p>
        </div>
      );
  }
}

function MarkdownCell({ cell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const [editContent, setEditContent] = useState(cell.content);
  const isEditing = state.editingCellId === cell.id;

  const handleSave = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: { content: editContent }
      }
    });
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
  };

  const handleCancel = () => {
    setEditContent(cell.content);
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${state.selectedCellId === cell.id ? 'ring-2 ring-blue-500' : ''}`}
         onClick={() => dispatch({ type: ActionTypes.SET_SELECTED_CELL, payload: cell.id })}>
      <CellHeader cell={cell} isSelected={state.selectedCellId === cell.id} />
      
      {!cell.collapsed && (
        <div className="p-4">
          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter markdown content..."
              />
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {parseMarkdown(cell.content)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function StateCell({ cell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  
  const persistStateToDataset = async (cellId, stateIndex) => {
    const targetCell = state.cells.find(c => c.id === cellId && c.type === 'state');
    if (!targetCell || !targetCell.states[stateIndex]) return;
    
    const stateObj = targetCell.states[stateIndex];
    
    try {
      // Import the SQLite engine
      const { sqliteEngine } = await import('../services/sqliteEngine');
      
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
        
        // Mark the state as persistent
        const updatedStates = targetCell.states.map((s, i) => 
          i === stateIndex ? { ...s, persistent: true } : s
        );
        
        dispatch({
          type: ActionTypes.UPDATE_CELL,
          payload: {
            id: cellId,
            updates: { states: updatedStates }
          }
        });
        
        // Show success notification
        alert(`State "${stateObj.name}" has been computed and persisted to the dataset as a new column.`);
      } else {
        alert(`Error computing state: ${result.error}`);
      }
    } catch (error) {
      console.error('Error persisting state:', error);
      alert(`Error persisting state: ${error.message}`);
    }
  };

  const addStateToQuery = (stateObj) => {
    // Find the most recent data cell to add the state to
    const dataCells = state.cells.filter(c => c.type === 'data');
    if (dataCells.length === 0) {
      alert('No data cells found to add state to. Create a data cell first.');
      return;
    }
    
    const lastDataCell = dataCells[dataCells.length - 1];
    const currentQuery = lastDataCell.query || 'SELECT * FROM transactions';
    
    // Add the state as a computed column in the query
    let newQuery;
    if (currentQuery.toLowerCase().includes('select') && currentQuery.toLowerCase().includes('from')) {
      // Insert the state computation before FROM
      const fromIndex = currentQuery.toLowerCase().indexOf('from');
      const selectPart = currentQuery.substring(0, fromIndex).trim();
      const fromPart = currentQuery.substring(fromIndex);
      
      // Remove trailing comma if present
      const cleanSelectPart = selectPart.replace(/,\s*$/, '');
      newQuery = `${cleanSelectPart}, (${stateObj.query}) AS ${stateObj.name} ${fromPart}`;
    } else {
      newQuery = `SELECT *, (${stateObj.query}) AS ${stateObj.name} FROM transactions`;
    }
    
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: lastDataCell.id,
        updates: { 
          query: newQuery,
          executed: false,
          queryResults: []
        }
      }
    });
    
    alert(`State "${stateObj.name}" added to query in cell ${lastDataCell.id}`);
  };

  const useStateInCell = (stateObj) => {
    // Create a new data cell with a query that uses this state
    const newId = Date.now();
    const newCell = {
      id: newId,
      type: 'data',
      title: `Analysis using ${stateObj.name}`,
      query: `SELECT user_id, ${stateObj.name}, charged_amount FROM transactions WHERE ${stateObj.name} IS NOT NULL ORDER BY ${stateObj.name} DESC LIMIT 20`,
      columns: [],
      visibleColumns: [],
      filters: [],
      collapsed: false,
      executed: false,
      executionTime: null,
      rowCount: null,
      queryResults: []
    };

    dispatch({
      type: ActionTypes.ADD_CELL,
      payload: { cell: newCell, afterId: cell.id }
    });
    
    alert(`New data cell created using state "${stateObj.name}"`);
  };
  
  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${state.selectedCellId === cell.id ? 'ring-2 ring-blue-500' : ''}`}
         onClick={() => dispatch({ type: ActionTypes.SET_SELECTED_CELL, payload: cell.id })}>
      <CellHeader cell={cell} isSelected={state.selectedCellId === cell.id} />
      
      {!cell.collapsed && (
        <div className="p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Computed States</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // First open the add state modal
                  dispatch({
                    type: ActionTypes.TOGGLE_MODAL,
                    payload: { modal: 'addState', value: { open: true, cellId: cell.id, showAIHelper: true } }
                  });
                }}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
              >
                <Icon name="Sparkles" className="w-3 h-3" />
                <span>AI</span>
              </button>
              <button 
                onClick={() => dispatch({
                  type: ActionTypes.TOGGLE_MODAL,
                  payload: { modal: 'addState', value: { open: true, cellId: cell.id } }
                })}
                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
              >
                + Add State
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {cell.states.map((state, index) => (
            <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-purple-900">{state.name}</span>
                  {state.persistent && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Persisted
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => dispatch({
                      type: ActionTypes.TOGGLE_MODAL,
                      payload: { 
                        modal: 'aiAssist', 
                        value: { 
                          open: true, 
                          cellId: cell.id, 
                          cellType: 'state',
                          context: `Computed State: ${state.name} - ${state.description || ''}\nQuery: ${state.query}`
                        } 
                      }
                    })}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
                  >
                    <Icon name="Sparkles" className="w-3 h-3" />
                    <span>AI</span>
                  </button>
                  <button 
                    onClick={() => dispatch({
                      type: ActionTypes.TOGGLE_MODAL,
                      payload: { modal: 'editState', value: { open: true, cellId: cell.id, stateIndex: index } }
                    })}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  {!state.persistent && (
                    <button 
                      onClick={() => persistStateToDataset(cell.id, index)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      Persist to Dataset
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-purple-700 mb-2">{state.description}</p>
              <div className="bg-white rounded p-2 border border-purple-200">
                <code className="text-xs font-mono text-purple-800">{state.query}</code>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

