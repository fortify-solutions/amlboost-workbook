import React, { useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';

export function CellHeader({ cell, isSelected }) {
  const { dispatch, ActionTypes } = useNotebook();
  const [showMenu, setShowMenu] = useState(false);

  const toggleCollapse = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: { collapsed: !cell.collapsed }
      }
    });
  };

  const toggleEdit = () => {
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: cell.id
    });
  };

  const deleteCell = () => {
    if (confirm('Delete this cell?')) {
      dispatch({
        type: ActionTypes.DELETE_CELL,
        payload: cell.id
      });
    }
    setShowMenu(false);
  };

  const duplicateCell = () => {
    const newCell = {
      ...cell,
      id: Date.now(),
      executed: false,
      executionTime: null,
      queryResults: [],
      messages: cell.type === 'ai' ? [] : undefined
    };
    
    dispatch({
      type: ActionTypes.ADD_CELL,
      payload: { cell: newCell, afterId: cell.id }
    });
    setShowMenu(false);
  };

  const getCellTypeIcon = (type) => {
    switch (type) {
      case 'markdown': return 'Edit3';
      case 'data': return 'Database';
      case 'chart': return 'BarChart3';
      case 'ai': return 'Brain';
      case 'state': return 'Settings';
      default: return 'Circle';
    }
  };

  const getCellTypeColor = (type) => {
    switch (type) {
      case 'markdown': return 'bg-gray-600';
      case 'data': return 'bg-blue-600';
      case 'chart': return 'bg-green-600';
      case 'ai': return 'bg-orange-600';
      case 'state': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getCellTypeLabel = (type) => {
    switch (type) {
      case 'markdown': return 'Markdown';
      case 'data': return 'Data Query';
      case 'chart': return 'Chart';
      case 'ai': return 'AI Assistant';
      case 'state': return 'Computed States';
      default: return type;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Icon name={getCellTypeIcon(cell.type)} className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {cell.title || getCellTypeLabel(cell.type)}
          </span>
        </div>
        {cell.executed && cell.executionTime && (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <Icon name="CheckCircle" className="w-3 h-3" />
            <span>{cell.executionTime}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={toggleEdit}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Edit cell"
        >
          <Icon name="Edit3" className="w-4 h-4" />
        </button>
        
        <button
          onClick={toggleCollapse}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title={cell.collapsed ? "Expand cell" : "Collapse cell"}
        >
          <Icon name={cell.collapsed ? "ChevronDown" : "ChevronUp"} className="w-4 h-4" />
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Cell options"
          >
            <Icon name="MoreVertical" className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
              <button
                onClick={duplicateCell}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Icon name="Copy" className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
              <button
                onClick={deleteCell}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
              >
                <Icon name="Trash2" className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}