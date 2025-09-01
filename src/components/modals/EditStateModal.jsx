import React, { useState, useEffect } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';

export function EditStateModal() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { editState } = state.modals;
  const [editedState, setEditedState] = useState({
    name: '',
    description: '',
    computationType: 'window_sum',
    field: 'charged_amount',
    condition: '',
    windowDays: 7,
    groupBy: 'merchant_id',
    persistent: false
  });

  // Load state data when modal opens
  useEffect(() => {
    if (editState.open && editState.cellId && editState.stateIndex !== undefined) {
      const targetCell = state.cells.find(c => c.id === editState.cellId && c.type === 'state');
      if (targetCell && targetCell.states[editState.stateIndex]) {
        const stateToEdit = targetCell.states[editState.stateIndex];
        setEditedState({
          name: stateToEdit.name || '',
          description: stateToEdit.description || '',
          computationType: stateToEdit.computationType || 'window_sum',
          field: stateToEdit.field || 'charged_amount',
          condition: stateToEdit.condition || '',
          windowDays: stateToEdit.windowDays || 7,
          groupBy: stateToEdit.groupBy || 'merchant_id',
          persistent: stateToEdit.persistent || false
        });
      }
    }
  }, [editState.open, editState.cellId, editState.stateIndex, state.cells]);

  const handleClose = () => {
    dispatch({
      type: ActionTypes.TOGGLE_MODAL,
      payload: { modal: 'editState', value: { open: false, cellId: null, stateIndex: null } }
    });
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
    if (!editedState.name.trim()) {
      alert('Please provide a state name');
      return;
    }

    const updatedStateObj = {
      name: editedState.name,
      description: editedState.description,
      query: generateStateQuery(editedState.computationType, editedState.field, editedState.condition, editedState.windowDays, editedState.groupBy),
      computationType: editedState.computationType,
      field: editedState.field,
      condition: editedState.condition,
      windowDays: editedState.windowDays,
      groupBy: editedState.groupBy,
      persistent: editedState.persistent
    };

    // Find the target state cell and update the state
    const targetCell = state.cells.find(c => c.id === editState.cellId && c.type === 'state');
    if (targetCell) {
      const updatedStates = [...targetCell.states];
      const oldState = updatedStates[editState.stateIndex];
      updatedStates[editState.stateIndex] = updatedStateObj;

      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: editState.cellId,
          updates: {
            states: updatedStates
          }
        }
      });

      // If persistent is checked and state wasn't persistent before, compute and persist
      if (editedState.persistent && !oldState.persistent) {
        try {
          // Import the SQLite engine
          const { sqliteEngine } = await import('../../services/sqliteEngine');
          
          // Compute the state values using SQL
          const computeQuery = `
            SELECT *, 
                   (${updatedStateObj.query}) as ${updatedStateObj.name}
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
            
            alert(`State "${updatedStateObj.name}" has been updated and persisted to the dataset.`);
          } else {
            alert(`State updated, but error computing values: ${result.error}`);
          }
        } catch (error) {
          console.error('Error persisting updated state:', error);
          alert(`State updated, but error persisting: ${error.message}`);
        }
      } else {
        alert(`State "${updatedStateObj.name}" has been updated.`);
      }
    }

    handleClose();
  };

  const handleDeleteState = () => {
    if (!confirm('Are you sure you want to delete this computed state?')) {
      return;
    }

    const targetCell = state.cells.find(c => c.id === editState.cellId && c.type === 'state');
    if (targetCell) {
      const updatedStates = targetCell.states.filter((_, index) => index !== editState.stateIndex);

      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          id: editState.cellId,
          updates: {
            states: updatedStates
          }
        }
      });

      alert('Computed state has been deleted.');
    }

    handleClose();
  };

  if (!editState.open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-[520px] max-w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900">Edit Computed State</h3>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State Name *</label>
              <input
                type="text"
                value={editedState.name}
                onChange={(e) => setEditedState({...editedState, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., user_fraud_risk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={editedState.description}
                onChange={(e) => setEditedState({...editedState, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Brief description of what this state represents"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Computation Type</label>
              <select
                value={editedState.computationType}
                onChange={(e) => setEditedState({...editedState, computationType: e.target.value})}
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
                  value={editedState.field}
                  onChange={(e) => setEditedState({...editedState, field: e.target.value})}
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
                  value={editedState.groupBy}
                  onChange={(e) => setEditedState({...editedState, groupBy: e.target.value})}
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

            {editedState.computationType.startsWith('window_') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Window Days</label>
                <input
                  type="number"
                  value={editedState.windowDays}
                  onChange={(e) => setEditedState({...editedState, windowDays: parseInt(e.target.value) || 7})}
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
                value={editedState.condition}
                onChange={(e) => setEditedState({...editedState, condition: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., fraud = 1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="persistent-edit"
                checked={editedState.persistent}
                onChange={(e) => setEditedState({...editedState, persistent: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="persistent-edit" className="text-sm text-gray-700">
                Persist to dataset (add as new column)
              </label>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Generated Query:</div>
              <div className="bg-white rounded border p-3 font-mono text-xs text-gray-600">
                {generateStateQuery(editedState.computationType, editedState.field, editedState.condition, editedState.windowDays, editedState.groupBy)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleDeleteState}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            <span>Delete</span>
          </button>
          
          <div className="flex items-center space-x-3">
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
              <Icon name="Save" className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}