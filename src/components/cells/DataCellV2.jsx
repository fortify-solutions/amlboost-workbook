import React, { useState, useEffect, useCallback } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { CellHeader } from './CellHeader';
import { DataTable } from '../ui/VirtualTable';

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
      } else if (value === '0' || value === 0 || value === false || value === 'false') {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            No
          </span>
        );
      }
      break;
  }
  
  return String(value);
}

export function DataCellV2({ 
  cell, 
  onExecute, 
  onLoadMorePages,
  columnTypes = {},
  isExecuting = false 
}) {
  const { dispatch, ActionTypes } = useNotebook();
  const [isEditing, setIsEditing] = useState(false);
  const [tempQuery, setTempQuery] = useState(cell.query || '');
  const [visibleColumns, setVisibleColumns] = useState(cell.visibleColumns || []);
  const [showColumnFilter, setShowColumnFilter] = useState(false);

  // Update visible columns when cell columns change
  useEffect(() => {
    if (cell.columns && cell.columns.length > 0) {
      if (!cell.visibleColumns || cell.visibleColumns.length === 0) {
        setVisibleColumns(cell.columns);
      } else {
        setVisibleColumns(cell.visibleColumns);
      }
    }
  }, [cell.columns, cell.visibleColumns]);

  const handleSave = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        query: tempQuery
      }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempQuery(cell.query || '');
    setIsEditing(false);
  };

  const toggleColumn = (column) => {
    const newVisibleColumns = visibleColumns.includes(column)
      ? visibleColumns.filter(col => col !== column)
      : [...visibleColumns, column];
    
    setVisibleColumns(newVisibleColumns);
    
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        visibleColumns: newVisibleColumns
      }
    });
  };

  // Handle loading additional pages for virtual scrolling
  const handleLoadPage = useCallback(async (page) => {
    if (onLoadMorePages) {
      return await onLoadMorePages(cell.id, page);
    }
    return [];
  }, [onLoadMorePages, cell.id]);

  // Prepare columns with formatting
  const tableColumns = visibleColumns.map(col => ({
    name: col,
    label: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
    width: col.length < 10 ? 120 : Math.min(col.length * 8 + 40, 200),
    render: (value, row, index) => formatCellValue(value, col, columnTypes)
  }));

  const cellActions = [
    {
      icon: 'Play',
      label: 'Run Query',
      onClick: () => onExecute && onExecute(cell.id),
      disabled: isExecuting || !cell.query?.trim()
    },
    {
      icon: 'Columns',
      label: 'Filter Columns',
      onClick: () => setShowColumnFilter(!showColumnFilter),
      disabled: !cell.columns || cell.columns.length === 0
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <CellHeader
        title={cell.title || 'Data Query'}
        cellType="data"
        onTitleChange={(newTitle) => dispatch({
          type: ActionTypes.UPDATE_CELL,
          payload: { id: cell.id, title: newTitle }
        })}
        actions={cellActions}
        cellId={cell.id}
      />
      
      <div className="p-4">
        {/* Query Editor */}
        <div className="mb-4">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={tempQuery}
                onChange={(e) => setTempQuery(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SELECT * FROM transactions WHERE ..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100"
            >
              {cell.query ? (
                <code className="text-sm text-gray-800 whitespace-pre-wrap">
                  {cell.query}
                </code>
              ) : (
                <span className="text-gray-400 text-sm">
                  Click to enter SQL query...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Column Filter */}
        {showColumnFilter && cell.columns && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Visible Columns</h4>
              <div className="text-xs text-gray-500">
                {visibleColumns.length} of {cell.columns.length} columns
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {cell.columns.map(column => (
                <label key={column} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                    className="mr-2"
                  />
                  <span className="truncate">{column}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Status Display */}
        {cell.executionTime && (
          <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Execution time: {cell.executionTime}
            </span>
            {cell.cached && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Icon name="Zap" size={12} className="mr-1" />
                Cached
              </span>
            )}
            {cell.pagination && (
              <span>
                {cell.pagination.total.toLocaleString()} total rows
              </span>
            )}
          </div>
        )}

        {/* Loading State */}
        {isExecuting && (
          <div className="mb-4 flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">Executing query...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {cell.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <Icon name="AlertCircle" className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700 font-medium">Query Error</span>
            </div>
            <p className="mt-1 text-sm text-red-600">{cell.error}</p>
          </div>
        )}

        {/* Results Table with Virtual Scrolling */}
        {cell.queryResults && cell.queryResults.length > 0 && !isExecuting && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <DataTable
              queryResults={cell.queryResults}
              columns={visibleColumns}
              totalRows={cell.rowCount || cell.queryResults.length}
              onLoadPage={handleLoadPage}
              loading={isExecuting}
              className="max-h-96"
            />
          </div>
        )}

        {/* Empty State */}
        {!cell.queryResults?.length && !isExecuting && !cell.error && cell.query && (
          <div className="text-center py-8 text-gray-500">
            <Icon name="Database" className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No results found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your query</p>
          </div>
        )}

        {/* No Query State */}
        {!cell.query && !isEditing && (
          <div className="text-center py-8 text-gray-500">
            <Icon name="Code" className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter a SQL query to get started</p>
            <p className="text-xs text-gray-400 mt-1">Click above to write your query</p>
          </div>
        )}
      </div>
    </div>
  );
}