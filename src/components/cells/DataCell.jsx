import React, { useState, useEffect } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { CellHeader } from './CellHeader';

// Helper function to format cell values using type information
function formatCellValue(value, columnName, columnTypes = {}) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">-</span>;
  }
  
  const columnType = columnTypes[columnName] || 'text';
  
  switch (columnType) {
    case 'currency':
      const currencyValue = parseFloat(value);
      if (!isNaN(currencyValue)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(currencyValue);
      }
      break;
      
    case 'integer':
      const intValue = parseInt(value);
      if (!isNaN(intValue)) {
        return intValue.toLocaleString();
      }
      break;
      
    case 'decimal':
      const decimalValue = parseFloat(value);
      if (!isNaN(decimalValue)) {
        return decimalValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      break;
      
    case 'percentage':
      const percentValue = parseFloat(value);
      if (!isNaN(percentValue)) {
        return (percentValue * 100).toFixed(1) + '%';
      }
      break;
      
    case 'date':
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        return dateValue.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      break;
      
    case 'datetime':
      const datetimeValue = new Date(value);
      if (!isNaN(datetimeValue.getTime())) {
        return datetimeValue.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      break;
      
    case 'boolean':
      if (value === '1' || value === 1 || value === true || value === 'true') {
        const isFraudOrDecline = columnName.includes('fraud') || columnName.includes('decline');
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isFraudOrDecline ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {isFraudOrDecline ? 'Yes' : '✓'}
          </span>
        );
      }
      if (value === '0' || value === 0 || value === false || value === 'false') {
        const isFraudOrDecline = columnName.includes('fraud') || columnName.includes('decline');
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isFraudOrDecline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isFraudOrDecline ? 'No' : '✗'}
          </span>
        );
      }
      break;
      
    case 'id':
      const stringValue = String(value);
      if (stringValue.length > 20) {
        return (
          <span title={stringValue} className="font-mono text-xs">
            {stringValue.substring(0, 8)}...{stringValue.substring(stringValue.length - 8)}
          </span>
        );
      }
      return <span className="font-mono text-xs">{stringValue}</span>;
      
    case 'category':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {String(value)}
        </span>
      );
  }
  
  // Default text formatting
  const stringValue = String(value);
  if (stringValue.length > 50) {
    return <span title={stringValue}>{stringValue.substring(0, 47)}...</span>;
  }
  
  return stringValue;
}

export function DataCell({ cell, executeCell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const [editQuery, setEditQuery] = useState(cell.query);
  const [editTitle, setEditTitle] = useState(cell.title);
  const isEditing = state.editingCellId === cell.id;

  // Sync edit state with cell changes (e.g., when AI updates the query)
  useEffect(() => {
    setEditQuery(cell.query);
    setEditTitle(cell.title);
  }, [cell.query, cell.title]);

  const handleSave = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: { query: editQuery, title: editTitle }
      }
    });
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
  };

  const handleCancel = () => {
    setEditQuery(cell.query);
    setEditTitle(cell.title);
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${state.selectedCellId === cell.id ? 'ring-2 ring-blue-500' : ''}`}
         onClick={() => dispatch({ type: ActionTypes.SET_SELECTED_CELL, payload: cell.id })}>
      <CellHeader cell={cell} isSelected={state.selectedCellId === cell.id} />
      
      {/* Data cell specific action buttons */}
      <div className="flex items-center justify-end space-x-2 px-3 py-2 border-b border-gray-100 bg-gray-25">
        <button
          onClick={() => dispatch({
            type: ActionTypes.TOGGLE_MODAL,
            payload: { modal: 'aiAssist', value: { open: true, cellId: cell.id } }
          })}
          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
        >
          <Icon name="Sparkles" className="w-3 h-3" />
          <span>AI</span>
        </button>
        <button 
          onClick={() => executeCell(cell.id)}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
        >
          <Icon name="Play" className="w-3 h-3" />
          <span>Run</span>
        </button>
      </div>
      
      {!cell.collapsed && (
        <div className="p-4">
          {isEditing ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Query title..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">SQL Query</label>
                <textarea
                  value={editQuery}
                  onChange={(e) => setEditQuery(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="SELECT * FROM transactions..."
                />
              </div>
              <div className="flex items-center space-x-2">
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
            <>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">SQL Query</h4>
                <div className="bg-gray-50 rounded border p-3 font-mono text-sm">
                  {cell.query}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Results</h4>
                  <span className="text-xs text-gray-500">
                    {cell.queryError ? 'Error' : `${cell.rowCount || 0} rows`}
                  </span>
                </div>
                
                {cell.queryError ? (
                  <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {cell.queryError}
                  </div>
                ) : cell.queryResults && cell.queryResults.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {cell.visibleColumns?.map(column => (
                            <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cell.queryResults.slice(0, 10).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            {cell.visibleColumns?.map(column => (
                              <td key={column} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                {formatCellValue(row[column], column, state.columnTypes)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cell.queryResults.length > 10 && (
                      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
                        Showing 10 of {cell.queryResults.length} results
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Icon name="Database" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Click the Play button to execute the query</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}