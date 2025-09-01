import React, { useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';

export function AddCellMenu({ afterId = null }) {
  const { dispatch, ActionTypes } = useNotebook();
  const [showMenu, setShowMenu] = useState(false);

  const addCell = (type) => {
    const newId = Date.now();
    let newCell;

    switch (type) {
      case 'markdown':
        newCell = {
          id: newId,
          type: 'markdown',
          content: '# New Section\n\nAdd your markdown content here...',
          collapsed: false,
          executed: true,
          executionTime: null
        };
        break;
      case 'data':
        newCell = {
          id: newId,
          type: 'data',
          title: 'New Data Query',
          query: 'SELECT * FROM transactions LIMIT 10',
          columns: [],
          visibleColumns: [],
          filters: [],
          collapsed: false,
          executed: false,
          executionTime: null,
          rowCount: null,
          queryResults: []
        };
        break;
      case 'chart':
        newCell = {
          id: newId,
          type: 'chart',
          title: 'New Chart',
          chartType: 'line',
          query: '',
          collapsed: false,
          executed: false,
          executionTime: null
        };
        break;
      case 'ai':
        newCell = {
          id: newId,
          type: 'ai',
          title: 'AI Assistant',
          messages: [],
          collapsed: false,
          executed: false,
          executionTime: null
        };
        break;
      case 'state':
        newCell = {
          id: newId,
          type: 'state',
          title: 'Computed States',
          states: [],
          collapsed: false,
          executed: false,
          executionTime: null
        };
        break;
      default:
        return;
    }

    dispatch({
      type: ActionTypes.ADD_CELL,
      payload: { cell: newCell, afterId }
    });
    
    setShowMenu(false);
  };

  return (
    <div className="relative flex justify-center my-2">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 border border-dashed border-gray-300"
      >
        <Icon name="Plus" className="w-4 h-4" />
        <span className="text-sm">Add Cell</span>
      </button>

      {showMenu && (
        <div className="absolute top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
          <div className="p-1">
            <button
              onClick={() => addCell('markdown')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-3"
            >
              <Icon name="Edit3" className="w-4 h-4 text-gray-500" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => addCell('data')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-3"
            >
              <Icon name="Database" className="w-4 h-4 text-blue-500" />
              <span>Data Query</span>
            </button>
            <button
              onClick={() => addCell('chart')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-3"
            >
              <Icon name="BarChart3" className="w-4 h-4 text-green-500" />
              <span>Chart</span>
            </button>
            <button
              onClick={() => addCell('state')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-3"
            >
              <Icon name="Settings" className="w-4 h-4 text-purple-500" />
              <span>Computed States</span>
            </button>
            <button
              onClick={() => addCell('ai')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-3"
            >
              <Icon name="Brain" className="w-4 h-4 text-orange-500" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}