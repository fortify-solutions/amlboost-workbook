import React, { useState, useEffect } from 'react';
import { csvLoader } from '../services/csvLoader';
import { sqliteEngine } from '../services/sqliteEngine';
import { Icon } from './ui/Icon';
import { parseMarkdown } from '../utils/markdownParser';

export function SimpleNotebook() {
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [error, setError] = useState(null);
  
  const [cells] = useState([
    {
      id: 1,
      type: 'markdown',
      content: '# Transaction Analysis Notebook\n\nThis notebook contains our analysis of financial transaction data, including fraud detection, geographic patterns, and payment method analysis.',
    },
    {
      id: 2,
      type: 'data',
      title: 'Load Transaction Data',
      query: 'SELECT * FROM transactions ORDER BY txn_date_time DESC LIMIT 10',
      executed: false,
      results: [],
      error: null
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load CSV data...');
      
      const result = await csvLoader.loadCSV('./data.csv', 1000);
      
      if (result.success) {
        console.log('CSV loaded successfully:', result.data.length, 'rows');
        setCsvData(result.data);
        
        // Set column types and load data into SQLite
        await sqliteEngine.setColumnTypes(result.columnTypes);
        await sqliteEngine.setData(result.data);
        
        // Auto-execute the first data cell
        setTimeout(() => {
          executeCell(2);
        }, 100);
      } else {
        console.error('Failed to load CSV:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeCell = async (cellId) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'data') return;

    console.log('Executing cell:', cellId, 'with query:', cell.query);
    const result = sqliteEngine.execute(cell.query);
    console.log('SQL result:', result);
    
    // Update cell state (simplified for now)
    cell.executed = true;
    cell.results = result.success ? result.data : [];
    cell.error = result.success ? null : result.error;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction data...</p>
          <p className="text-sm text-gray-500 mt-2">Rows loaded: {csvData.length}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Icon name="X" className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Transaction Analysis Notebook v2.0 (Simple)
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {cells.map(cell => (
          <div key={cell.id} className="border border-gray-200 rounded-lg bg-white">
            <div className="p-4">
              {cell.type === 'markdown' ? (
                <div className="prose prose-sm max-w-none">
                  {parseMarkdown(cell.content)}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{cell.title}</h3>
                    <button 
                      onClick={() => executeCell(cell.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                      <Icon name="Play" className="w-4 h-4" />
                      <span>Run</span>
                    </button>
                  </div>
                  
                  <div className="mb-4 bg-gray-50 rounded p-3 font-mono text-sm">
                    {cell.query}
                  </div>

                  {cell.error ? (
                    <div className="text-red-600 bg-red-50 p-3 rounded">
                      Error: {cell.error}
                    </div>
                  ) : cell.results.length > 0 ? (
                    <div className="overflow-x-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(cell.results[0]).map(col => (
                              <th key={col} className="px-3 py-2 text-left font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cell.results.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-2">
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : cell.executed ? (
                    <div className="text-gray-500 text-center py-4">
                      No results
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      Click Run to execute
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}