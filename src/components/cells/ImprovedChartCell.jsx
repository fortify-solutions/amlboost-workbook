import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { Icon } from '../ui/Icon';
import { chartService } from '../../services/chartService';
import { ChartDataProcessor } from '../../utils/chartDataProcessor';

export function ImprovedChartCell({ cell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const chartRef = useRef(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Chart configuration state
  const [config, setConfig] = useState({
    title: cell.title || 'New Chart',
    chartType: cell.chartType || 'line',
    dataSource: cell.dataSource || 'csv',
    query: cell.query || '',
    xAxis: cell.xAxis || '',
    yAxis: cell.yAxis || '',
    zAxis: cell.zAxis || '',
    groupBy: cell.groupBy || '',
    aggregation: cell.aggregation || 'none',
    filterCondition: cell.filterCondition || '',
    colorBy: cell.colorBy || '',
    sizeBy: cell.sizeBy || '',
    sortBy: cell.sortBy || '',
    sortOrder: cell.sortOrder || 'asc',
    limit: cell.limit || 100
  });

  const isEditing = state.editingCellId === cell.id;
  const chartId = `chart-${cell.id}`;

  // Get chart data based on source
  const chartData = useMemo(() => {
    if (config.dataSource === 'csv' && state.csvData.length > 0) {
      return state.csvData;
    } else if (config.dataSource === 'query' && cell.queryResults && cell.queryResults.length > 0) {
      return cell.queryResults;
    }
    return [];
  }, [config.dataSource, state.csvData, cell.queryResults]);

  // Get available columns
  const availableColumns = useMemo(() => {
    if (chartData.length > 0) {
      return Object.keys(chartData[0]);
    }
    return [];
  }, [chartData]);

  // Process data for chart
  const processedData = useMemo(() => {
    if (!chartData.length) return [];
    return ChartDataProcessor.processData(chartData, config);
  }, [chartData, config]);

  // Validate configuration
  const validation = useMemo(() => {
    return ChartDataProcessor.validateConfig(processedData, config);
  }, [processedData, config]);

  // Initialize chart when component mounts or data changes
  useEffect(() => {
    if (!chartRef.current || !window.echarts) return;

    const initializeChart = async () => {
      try {
        setError(null);
        setIsLoading(true);

        await chartService.initChart(chartId, chartRef.current);
        
        if (processedData.length > 0 && validation.valid) {
          await chartService.renderChart(chartId, processedData, config);
        } else if (!validation.valid) {
          setError(validation.errors[0]);
        }
      } catch (err) {
        console.error('Chart initialization failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChart();

    // Cleanup on unmount
    return () => {
      chartService.disposeChart(chartId);
    };
  }, [chartId]);

  // Update chart when data or config changes
  useEffect(() => {
    if (!chartService.hasValidChart(chartId)) return;

    const updateChart = async () => {
      try {
        setError(null);
        
        if (processedData.length > 0 && validation.valid) {
          setIsLoading(true);
          await chartService.renderChart(chartId, processedData, config);
        } else if (!validation.valid) {
          setError(validation.errors[0]);
        }
      } catch (err) {
        console.error('Chart update failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    updateChart();
  }, [chartId, processedData, config, validation]);

  const handleSave = () => {
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: {
          ...config,
          executed: true,
          executionTime: '0.1s'
        }
      }
    });
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
    setIsConfiguring(false);
  };

  const handleCancel = () => {
    setConfig({
      title: cell.title || 'New Chart',
      chartType: cell.chartType || 'line',
      dataSource: cell.dataSource || 'csv',
      query: cell.query || '',
      xAxis: cell.xAxis || '',
      yAxis: cell.yAxis || '',
      zAxis: cell.zAxis || '',
      groupBy: cell.groupBy || '',
      aggregation: cell.aggregation || 'none',
      filterCondition: cell.filterCondition || '',
      colorBy: cell.colorBy || '',
      sizeBy: cell.sizeBy || '',
      sortBy: cell.sortBy || '',
      sortOrder: cell.sortOrder || 'asc',
      limit: cell.limit || 100
    });
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
    setIsConfiguring(false);
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = async () => {
    if (!chartService.hasValidChart(chartId)) return;
    
    try {
      setError(null);
      setIsLoading(true);
      await chartService.renderChart(chartId, processedData, config);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart type options
  const chartTypeOptions = [
    { value: 'line', label: 'Line Chart', icon: 'BarChart3' },
    { value: 'bar', label: 'Bar Chart', icon: 'BarChart3' },
    { value: 'column', label: 'Column Chart', icon: 'BarChart3' },
    { value: 'area', label: 'Area Chart', icon: 'BarChart3' },
    { value: 'pie', label: 'Pie Chart', icon: 'BarChart3' },
    { value: 'scatter', label: 'Scatter Plot', icon: 'BarChart3' },
    { value: 'bubble', label: 'Bubble Chart', icon: 'BarChart3' },
    { value: 'heatmap', label: 'Heatmap', icon: 'BarChart3' }
  ];

  const aggregationOptions = [
    { value: 'none', label: 'No Aggregation' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];

  return (
    <div 
      className={`border border-gray-200 rounded-lg bg-white ${
        state.selectedCellId === cell.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => dispatch({ type: ActionTypes.SET_SELECTED_CELL, payload: cell.id })}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Icon name="BarChart3" className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">{config.title}</span>
          </div>
          {cell.executed && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <Icon name="CheckCircle" className="w-3 h-3" />
              <span>{cell.executionTime}</span>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <Icon name="Clock" className="w-3 h-3 animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
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
            onClick={() => {
              dispatch({ type: ActionTypes.SET_EDITING_CELL, payload: cell.id });
              setIsConfiguring(true);
            }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Configure
          </button>
        </div>
      </div>

      {!cell.collapsed && (
        <div className="p-4">
          {isConfiguring || isEditing ? (
            <ChartConfiguration
              config={config}
              onConfigChange={handleConfigChange}
              availableColumns={availableColumns}
              chartTypeOptions={chartTypeOptions}
              aggregationOptions={aggregationOptions}
              onSave={handleSave}
              onCancel={handleCancel}
              validation={validation}
              dataStats={{
                totalRows: chartData.length,
                processedRows: processedData.length,
                columnTypes: chartData.length > 0 ? ChartDataProcessor.detectColumnTypes(chartData) : {}
              }}
            />
          ) : (
            <>
              {config.xAxis && config.yAxis ? (
                <div>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Chart Error</h3>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    ref={chartRef}
                    className="w-full border border-gray-200 rounded bg-white relative" 
                    style={{ 
                      height: '320px',
                      minHeight: '320px'
                    }}
                  >
                    {isLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <Icon name="Clock" className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-600">Rendering chart...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Data:</span> {config.dataSource === 'csv' ? 'CSV Data' : 'Custom Query'} • 
                      <span className="font-medium"> Type:</span> {chartTypeOptions.find(opt => opt.value === config.chartType)?.label} • 
                      <span className="font-medium"> X:</span> {config.xAxis} • 
                      <span className="font-medium"> Y:</span> {config.yAxis}
                      {config.groupBy && <><span className="font-medium"> • Group:</span> {config.groupBy}</>}
                      {config.aggregation !== 'none' && <><span className="font-medium"> • Agg:</span> {config.aggregation}</>}
                      <span className="font-medium"> • Rows:</span> {processedData.length}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleRefresh}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        disabled={isLoading}
                      >
                        <Icon name="Clock" className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => {
                          dispatch({ type: ActionTypes.SET_EDITING_CELL, payload: cell.id });
                          setIsConfiguring(true);
                        }}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        Reconfigure
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-gray-50 rounded border flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Icon name="BarChart3" className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Chart not configured</p>
                    <p className="text-xs mt-1">Click "Configure" to set up your chart</p>
                    {availableColumns.length > 0 && (
                      <p className="text-xs mt-2 text-gray-400">
                        Available columns: {availableColumns.slice(0, 5).join(', ')}
                        {availableColumns.length > 5 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Enhanced Chart Configuration Component
function ChartConfiguration({ 
  config, 
  onConfigChange, 
  availableColumns, 
  chartTypeOptions, 
  aggregationOptions, 
  onSave, 
  onCancel, 
  validation,
  dataStats 
}) {
  const columnOptions = availableColumns.map(col => ({ value: col, label: col }));
  const sortOptions = [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }];

  // Get chart type recommendations
  const recommendations = availableColumns.length > 0 && config.xAxis && config.yAxis && dataStats.columnTypes
    ? ChartDataProcessor.getRecommendedChartTypes(dataStats.columnTypes, config.xAxis, config.yAxis, config.zAxis)
    : [];

  const renderDropdown = (label, field, options, placeholder = "Select option", hint = null) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {hint && <span className="text-xs text-gray-500 ml-1">({hint})</span>}
      </label>
      <select
        value={config[field]}
        onChange={(e) => onConfigChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  const renderInput = (label, field, type = "text", placeholder = "", hint = null) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {hint && <span className="text-xs text-gray-500 ml-1">({hint})</span>}
      </label>
      <input
        type={type}
        value={config[field]}
        onChange={(e) => onConfigChange(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Data Summary */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center">
          <Icon name="Database" className="w-4 h-4 text-blue-500 mr-2" />
          <h3 className="text-sm font-medium text-blue-800">Data Summary</h3>
        </div>
        <div className="mt-2 text-sm text-blue-700">
          <p>Total rows: {dataStats.totalRows} • Processed rows: {dataStats.processedRows}</p>
          <p>Available columns: {availableColumns.join(', ')}</p>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.valid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Configuration Issues</h3>
              <ul className="text-sm text-red-700 mt-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {renderInput("Chart Title", "title", "text", "Enter chart title")}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            {recommendations.length > 0 && (
              <div className="mb-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                <Icon name="Info" className="w-3 h-3 inline mr-1" />
                Recommended: {recommendations[0].type} ({recommendations[0].reason})
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {chartTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onConfigChange('chartType', option.value)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    config.chartType === option.value 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  } ${recommendations.some(r => r.type === option.value) ? 'ring-1 ring-yellow-300' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name={option.icon} className="w-4 h-4" />
                    <span className="text-sm">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dataSource"
                  value="csv"
                  checked={config.dataSource === 'csv'}
                  onChange={(e) => onConfigChange('dataSource', e.target.value)}
                  className="mr-2"
                />
                CSV Data ({dataStats.totalRows} rows)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dataSource"
                  value="query"
                  checked={config.dataSource === 'query'}
                  onChange={(e) => onConfigChange('dataSource', e.target.value)}
                  className="mr-2"
                />
                Custom Query
              </label>
            </div>
          </div>

          {config.dataSource === 'query' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">SQL Query</label>
              <textarea
                value={config.query}
                onChange={(e) => onConfigChange('query', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                placeholder="SELECT x, y FROM transactions..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Axis Configuration */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.chartType === 'pie' ? (
            <>
              {renderDropdown("Category Column", "xAxis", columnOptions, "Select category column", "Labels for pie slices")}
              {renderDropdown("Value Column", "yAxis", columnOptions, "Select value column", "Size of pie slices")}
            </>
          ) : config.chartType === 'heatmap' ? (
            <>
              {renderDropdown("X Axis", "xAxis", columnOptions, "Select X axis column")}
              {renderDropdown("Y Axis", "yAxis", columnOptions, "Select Y axis column")}
              {renderDropdown("Value Column", "zAxis", columnOptions, "Select value column", "Heat intensity")}
            </>
          ) : (
            <>
              {renderDropdown("X Axis", "xAxis", columnOptions, "Select X axis column")}
              {renderDropdown("Y Axis", "yAxis", columnOptions, "Select Y axis column")}
              {['bubble', 'scatter'].includes(config.chartType) && 
                renderDropdown("Size Column", "zAxis", columnOptions, "Select column for size", "Bubble size")
              }
            </>
          )}
        </div>
      </div>

      {/* Data Processing */}
      {!['pie', 'heatmap'].includes(config.chartType) && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Processing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDropdown("Group By", "groupBy", columnOptions, "Group data by column (optional)")}
            {config.groupBy && renderDropdown("Aggregation", "aggregation", aggregationOptions, "Select aggregation method")}
            {renderDropdown("Sort By", "sortBy", columnOptions, "Sort data by column (optional)")}
            {config.sortBy && renderDropdown("Sort Order", "sortOrder", sortOptions)}
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderInput("Filter Condition", "filterCondition", "text", "e.g., amount > 100", "Simple conditions only")}
          {renderInput("Row Limit", "limit", "number", "100", "Maximum rows to display")}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t pt-4 flex items-center justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className={`px-4 py-2 text-sm text-white rounded transition-colors flex items-center space-x-2 ${
            validation.valid 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!validation.valid}
        >
          <Icon name="Save" className="w-4 h-4" />
          <span>Apply Configuration</span>
        </button>
      </div>
    </div>
  );
}