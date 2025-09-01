import React, { useRef, useEffect, useState } from 'react';
import { useNotebook } from '../../stores/NotebookContext';
import { useCSVLoader } from '../../hooks/useCSVLoader';
import { Icon } from '../ui/Icon';

export function ChartCell({ cell }) {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { executeCell } = useCSVLoader();
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [chartError, setChartError] = useState(null);
  
  // Chart configuration state
  const [config, setConfig] = useState({
    title: cell.title || 'New Chart',
    chartType: cell.chartType || 'line',
    dataSource: cell.dataSource || 'csv', // 'csv' or 'query'
    query: cell.query || '',
    xAxis: cell.xAxis || '',
    yAxis: cell.yAxis || '',
    zAxis: cell.zAxis || '', // For bubble charts, etc.
    groupBy: cell.groupBy || '',
    aggregation: cell.aggregation || 'none', // 'sum', 'avg', 'count', 'none'
    filterCondition: cell.filterCondition || '',
    colorBy: cell.colorBy || '',
    sizeBy: cell.sizeBy || '', // For bubble charts
    sortBy: cell.sortBy || '',
    sortOrder: cell.sortOrder || 'asc',
    limit: cell.limit || 100,
    showHeatmapLabels: cell.showHeatmapLabels !== undefined ? cell.showHeatmapLabels : 'auto' // 'auto', 'always', 'never'
  });

  const isEditing = state.editingCellId === cell.id;

  // Get available columns based on data source
  const getAvailableColumns = () => {
    if (config.dataSource === 'query' && cell.queryResults && cell.queryResults.length > 0) {
      // Use columns from query results
      return Object.keys(cell.queryResults[0]);
    } else if (state.csvData && state.csvData.length > 0) {
      // Use CSV data for both CSV data source and fallback
      return Object.keys(state.csvData[0]);
    }
    return [];
  };

  // Chart type options
  const chartTypeOptions = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'column', label: 'Column Chart' },
    { value: 'area', label: 'Area Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'bubble', label: 'Bubble Chart' },
    { value: 'heatmap', label: 'Heatmap' }
  ];

  // Aggregation options
  const aggregationOptions = [
    { value: 'none', label: 'No Aggregation' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];

  // Update config when cell data changes
  useEffect(() => {
    if (cell) {
      setConfig(prev => ({
        ...prev,
        title: cell.title || prev.title,
        chartType: cell.chartType || prev.chartType,
        dataSource: cell.dataSource || prev.dataSource,
        query: cell.query || prev.query,
        xAxis: cell.xAxis || prev.xAxis,
        yAxis: cell.yAxis || prev.yAxis,
        zAxis: cell.zAxis || prev.zAxis,
        groupBy: cell.groupBy || prev.groupBy,
        aggregation: cell.aggregation || prev.aggregation,
        filterCondition: cell.filterCondition || prev.filterCondition,
        colorBy: cell.colorBy || prev.colorBy,
        sizeBy: cell.sizeBy || prev.sizeBy,
        sortBy: cell.sortBy || prev.sortBy,
        sortOrder: cell.sortOrder || prev.sortOrder,
        limit: cell.limit || prev.limit,
        showHeatmapLabels: cell.showHeatmapLabels !== undefined ? cell.showHeatmapLabels : prev.showHeatmapLabels
      }));
    }
  }, [cell]);

  // Initialize chart when component mounts
  useEffect(() => {
    console.log('Chart initialization effect:', {
      hasChartRef: !!chartRef.current,
      hasEcharts: !!window.echarts,
      hasChartInstance: !!chartInstance,
      echartsVersion: window.echarts?.version
    });
    
    if (chartRef.current && window.echarts && !chartInstance) {
      console.log('Initializing ECharts instance');
      
      // Ensure container has proper dimensions
      const container = chartRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('Container has zero dimensions, setting default size');
        container.style.width = '100%';
        container.style.height = '320px';
      }
      
      console.log('Chart container dimensions:', {
        width: container.clientWidth,
        height: container.clientHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight
      });
      
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        if (chartRef.current && !chartInstance) {
          try {
            console.log('Creating ECharts with init...');
            
            // Force container visibility and dimensions before init
            const container = chartRef.current;
            container.style.display = 'block';
            container.style.visibility = 'visible';
            
            // Create chart with explicit options
            const chart = window.echarts.init(container, null, {
              renderer: 'canvas',
              useDirtyRect: false
            });
            
            setChartInstance(chart);
            console.log('ECharts instance created successfully');
            
            // Check if canvas was created immediately
            const initialCanvas = container.querySelectorAll('canvas');
            console.log('Canvas elements immediately after init:', initialCanvas.length);
            
            // Also check after a delay
            setTimeout(() => {
              const canvasElements = container.querySelectorAll('canvas');
              console.log('Canvas elements after delay:', canvasElements?.length);
              if (canvasElements.length === 0) {
                console.error('ECharts failed to create canvas during initialization!');
              }
            }, 100);
          } catch (error) {
            console.error('Failed to initialize ECharts:', error);
          }
        }
      });
    } else if (!window.echarts) {
      console.warn('ECharts not available on window object');
    }
    
    // Cleanup function
    return () => {
      if (chartInstance) {
        console.log('Disposing ECharts instance');
        try {
          chartInstance.dispose();
        } catch (error) {
          console.warn('Error disposing chart:', error);
        }
        setChartInstance(null);
      }
    };
  }, [chartInstance]);

  // Update chart when data or configuration changes
  useEffect(() => {
    console.log('Chart render effect triggered:', {
      chartInstance: !!chartInstance,
      hasCSVData: state.csvData.length,
      hasQueryResults: cell.queryResults?.length,
      configKeys: Object.keys(config).length
    });
    if (chartInstance && config.xAxis && config.yAxis) {
      console.log('About to call renderChart...');
      renderChart();
      console.log('renderChart call completed');
    } else {
      console.log('Chart not ready for rendering:', {
        hasChartInstance: !!chartInstance,
        hasXAxis: !!config.xAxis,
        hasYAxis: !!config.yAxis
      });
    }
  }, [chartInstance, cell.queryResults, state.csvData, config.title, config.chartType, config.xAxis, config.yAxis, config.zAxis, config.dataSource]);

  // Validation function with chart-type specific rules
  const validateChartConfig = (data, config) => {
    const errors = [];
    
    if (!data || data.length === 0) {
      errors.push('No data available for chart');
      return { valid: false, errors };
    }
    
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    // Chart-type specific validation
    if (config.chartType === 'pie') {
      if (!config.xAxis) {
        errors.push('Category column is required for pie charts');
      }
      if (!config.yAxis) {
        errors.push('Value column is required for pie charts');
      }
      
      // Validate pie chart specific requirements
      if (config.yAxis && columns.includes(config.yAxis)) {
        const yValues = data.slice(0, 10).map(row => parseFloat(row[config.yAxis]));
        if (yValues.some(val => isNaN(val))) {
          errors.push(`Value column "${config.yAxis}" must contain numeric data for pie charts`);
        }
      }
    } else if (config.chartType === 'heatmap') {
      if (!config.xAxis) {
        errors.push('X-axis column is required for heatmaps');
      }
      if (!config.yAxis) {
        errors.push('Y-axis column is required for heatmaps');
      }
      if (!config.zAxis) {
        errors.push('Value column is required for heatmaps');
      }
      
      if (config.zAxis && columns.includes(config.zAxis)) {
        const zValues = data.slice(0, 10).map(row => parseFloat(row[config.zAxis]));
        if (zValues.some(val => isNaN(val))) {
          errors.push(`Value column "${config.zAxis}" must contain numeric data for heatmaps`);
        }
      }
    } else if (['scatter', 'bubble'].includes(config.chartType)) {
      if (!config.xAxis) {
        errors.push('X-axis column is required');
      }
      if (!config.yAxis) {
        errors.push('Y-axis column is required');
      }
      
      // Both X and Y should be numeric for scatter/bubble
      if (config.xAxis && columns.includes(config.xAxis)) {
        const xValues = data.slice(0, 10).map(row => row[config.xAxis]);
        const nonNumericX = xValues.filter(val => val !== '' && val !== null && val !== undefined && isNaN(parseFloat(val)));
        if (nonNumericX.length > 7) {
          errors.push(`X-axis column "${config.xAxis}" should contain mostly numeric data for ${config.chartType} charts. Found: ${nonNumericX.slice(0, 3).join(', ')}`);
        }
      }
      if (config.yAxis && columns.includes(config.yAxis)) {
        const yValues = data.slice(0, 10).map(row => row[config.yAxis]);
        const nonNumericY = yValues.filter(val => val !== '' && val !== null && val !== undefined && isNaN(parseFloat(val)));
        if (nonNumericY.length > 7) {
          errors.push(`Y-axis column "${config.yAxis}" should contain mostly numeric data for ${config.chartType} charts. Found: ${nonNumericY.slice(0, 3).join(', ')}`);
        }
      }
      
      if (config.chartType === 'bubble' && config.zAxis && columns.includes(config.zAxis)) {
        const zValues = data.slice(0, 10).map(row => row[config.zAxis]);
        const nonNumericZ = zValues.filter(val => val !== '' && val !== null && val !== undefined && isNaN(parseFloat(val)));
        if (nonNumericZ.length > 7) {
          errors.push(`Size column "${config.zAxis}" should contain mostly numeric data for bubble charts. Found: ${nonNumericZ.slice(0, 3).join(', ')}`);
        }
      }
    } else {
      // Standard charts (line, bar, column, area)
      if (!config.xAxis) {
        errors.push('X-axis column is required');
      }
      if (!config.yAxis) {
        errors.push('Y-axis column is required');
      }
      
      // Y-axis should be numeric for standard charts
      if (config.yAxis && columns.includes(config.yAxis)) {
        const yValues = data.slice(0, 10).map(row => row[config.yAxis]);
        console.log(`Validating Y-axis "${config.yAxis}":`, yValues);
        const nonNumeric = yValues.filter(val => val !== '' && val !== null && val !== undefined && isNaN(parseFloat(val)));
        console.log(`Non-numeric values for Y-axis "${config.yAxis}":`, nonNumeric);
        if (nonNumeric.length > 7) { // More lenient - allow up to 7 non-numeric out of 10
          errors.push(`Y-axis column "${config.yAxis}" should contain mostly numeric data. Found non-numeric values: ${nonNumeric.slice(0, 3).join(', ')}${nonNumeric.length > 3 ? '...' : ''}`);
        }
      }
    }
    
    // Check if columns exist in data
    if (config.xAxis && !columns.includes(config.xAxis)) {
      errors.push(`Selected column "${config.xAxis}" not found in data. Available columns: ${columns.join(', ')}`);
    }
    
    if (config.yAxis && !columns.includes(config.yAxis)) {
      errors.push(`Selected column "${config.yAxis}" not found in data. Available columns: ${columns.join(', ')}`);
    }
    
    if (config.zAxis && !columns.includes(config.zAxis)) {
      errors.push(`Selected column "${config.zAxis}" not found in data. Available columns: ${columns.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors };
  };

  const renderChart = () => {
    console.log('renderChart called:', {
      chartInstance: !!chartInstance,
      configDataSource: config.dataSource,
      configXAxis: config.xAxis,
      configYAxis: config.yAxis,
      csvDataLength: state.csvData.length,
      queryResultsLength: cell.queryResults?.length,
      cellId: cell.id,
      cellTitle: cell.title
    });

    // Show the chart container when rendering
    if (chartRef.current && config.xAxis && config.yAxis) {
      chartRef.current.style.display = 'block';
    }

    if (!chartInstance) {
      console.warn('Chart instance not available');
      setChartError('Chart not initialized properly');
      return;
    }
    
    // Clear previous errors
    setChartError(null);

    let data = [];
    
    // Get data based on source
    if (config.dataSource === 'query' && cell.queryResults && cell.queryResults.length > 0) {
      data = cell.queryResults;
      console.log('Using query results:', data.length, 'rows');
    } else if (state.csvData && state.csvData.length > 0) {
      // Use CSV data for both 'csv' data source and as fallback for 'query' without results
      data = state.csvData;
      console.log('Using CSV data:', data.length, 'rows');
    } else {
      console.log('No data available for chart:', {
        dataSource: config.dataSource,
        hasQueryResults: !!cell.queryResults,
        queryResultsLength: cell.queryResults?.length,
        hasCSVData: !!state.csvData,
        csvDataLength: state.csvData?.length,
        cellId: cell.id
      });
    }

    // Validate configuration
    console.log('=== VALIDATING CHART CONFIGURATION ===');
    console.log('Config:', config);
    console.log('Data sample:', data.slice(0, 2));
    console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : []);
    console.log('X-axis column requested:', config.xAxis);
    console.log('X-axis column exists:', data.length > 0 && Object.keys(data[0]).includes(config.xAxis));
    const validation = validateChartConfig(data, config);
    console.log('Validation result:', validation);
    
    if (!validation.valid) {
      console.error('Chart validation failed:', validation.errors);
      setChartError(validation.errors[0]); // Show first error to user
      
      // Show error in chart
      const option = {
        title: {
          text: 'Configuration Error',
          left: 'center',
          top: 'center',
          textStyle: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' }
        },
        graphic: {
          type: 'text',
          left: 'center',
          top: '60%',
          style: {
            text: validation.errors.join('\n'),
            textAlign: 'center',
            fill: '#6b7280',
            fontSize: 12,
            lineDash: [0, 0]
          }
        }
      };
      
      try {
        console.log('Setting error chart option');
        chartInstance.setOption(option, true);
      } catch (error) {
        console.error('Error showing chart error:', error);
      }
      return;
    }
    
    console.log('=== VALIDATION PASSED, PROCEEDING WITH CHART GENERATION ===');

    // Process data based on configuration
    let processedData = [...data];

    // Apply filter if specified
    if (config.filterCondition) {
      try {
        // Simple filter implementation (in real app, would use SQL engine)
        processedData = processedData.filter(row => {
          // Basic condition parsing (simplified)
          return true; // Placeholder
        });
      } catch (error) {
        console.warn('Filter condition error:', error);
      }
    }

    // Apply grouping and aggregation
    if (config.groupBy && config.aggregation !== 'none') {
      const grouped = {};
      processedData.forEach(row => {
        const groupKey = row[config.groupBy];
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(row);
      });

      processedData = Object.keys(grouped).map(groupKey => {
        const group = grouped[groupKey];
        const result = { [config.groupBy]: groupKey };
        
        if (config.aggregation === 'sum') {
          result[config.yAxis] = group.reduce((sum, row) => sum + (parseFloat(row[config.yAxis]) || 0), 0);
        } else if (config.aggregation === 'avg') {
          result[config.yAxis] = group.reduce((sum, row) => sum + (parseFloat(row[config.yAxis]) || 0), 0) / group.length;
        } else if (config.aggregation === 'count') {
          result[config.yAxis] = group.length;
        } else if (config.aggregation === 'min') {
          result[config.yAxis] = Math.min(...group.map(row => parseFloat(row[config.yAxis]) || 0));
        } else if (config.aggregation === 'max') {
          result[config.yAxis] = Math.max(...group.map(row => parseFloat(row[config.yAxis]) || 0));
        }
        
        return result;
      });
    }

    // Apply sorting
    if (config.sortBy) {
      processedData.sort((a, b) => {
        const aVal = a[config.sortBy];
        const bVal = b[config.sortBy];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return config.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    if (config.limit && config.limit > 0) {
      processedData = processedData.slice(0, config.limit);
    }

    // Generate chart option based on type
    console.log('=== GENERATING CHART OPTION ===');
    console.log('Chart type:', config.chartType);
    console.log('Processed data length:', processedData.length);
    console.log('Processed data sample:', processedData.slice(0, 3));
    
    const option = generateChartOption(processedData, config);
    console.log('=== GENERATED CHART OPTION ===');
    console.log('Chart option:', option);
    console.log('Chart container ref current:', !!chartRef.current);
    console.log('Chart instance ready:', !!chartInstance);
    
    try {
      console.log('=== SETTING CHART OPTION ===');
      chartInstance.setOption(option, true);
      console.log('Chart option set successfully');
      
      // Force resize after setting option
      setTimeout(() => {
        if (chartInstance && chartRef.current) {
          console.log('=== RESIZING CHART ===');
          chartInstance.resize();
          console.log('Chart resized');
          
          // Get canvas info for debugging
          const canvasElements = chartRef.current.querySelectorAll('canvas');
          console.log('Canvas elements found:', canvasElements?.length);
          if (canvasElements?.length > 0) {
            console.log('Canvas dimensions:', {
              width: canvasElements[0].width,
              height: canvasElements[0].height,
              style: canvasElements[0].style.cssText,
              visible: canvasElements[0].offsetParent !== null
            });
          } else {
            console.warn('No canvas elements found after chart render! Attempting to recreate...');
            
            // Try to recreate the ECharts instance
            try {
              console.log('Disposing current chart instance...');
              chartInstance.dispose();
              
              // Ensure container is visible and has dimensions
              const container = chartRef.current;
              console.log('Container before recreation:', {
                width: container.offsetWidth,
                height: container.offsetHeight,
                display: window.getComputedStyle(container).display,
                visibility: window.getComputedStyle(container).visibility
              });
              
              // Force container to be visible and have dimensions
              container.style.display = 'block';
              container.style.width = '100%';
              container.style.height = '320px';
              container.style.visibility = 'visible';
              
              setTimeout(() => {
                console.log('Recreating ECharts instance...');
                const newChart = window.echarts.init(container);
                setChartInstance(newChart);
                
                // Set the option again on the new instance
                newChart.setOption(option, true);
                console.log('Chart recreated and option set');
                
                // Check for canvas again
                setTimeout(() => {
                  const newCanvasElements = container.querySelectorAll('canvas');
                  console.log('Canvas elements after recreation:', newCanvasElements.length);
                }, 50);
              }, 50);
              
            } catch (error) {
              console.error('Error recreating chart:', error);
            }
          }
        }
      }, 100);
    } catch (error) {
      console.error('Error setting chart option:', error);
      console.error('Error details:', error.stack);
    }
  };

  const generateChartOption = (data, config) => {
    const baseOption = {
      title: {
        text: config.title || 'Chart',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'normal' }
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      }
    };

    if (config.chartType === 'pie') {
      return {
        ...baseOption,
        tooltip: { 
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        series: [{
          type: 'pie',
          radius: '60%',
          data: data.map(row => ({
            name: row[config.xAxis],
            value: parseFloat(row[config.yAxis]) || 0
          })),
          label: {
            show: true,
            formatter: '{b}: {c} ({d}%)'
          }
        }]
      };
    }

    if (config.chartType === 'heatmap') {
      // Process heatmap data
      const xCategories = [...new Set(data.map(row => row[config.xAxis]))];
      const yCategories = [...new Set(data.map(row => row[config.yAxis]))];
      
      const heatmapData = data.map(row => [
        xCategories.indexOf(row[config.xAxis]),
        yCategories.indexOf(row[config.yAxis]),
        parseFloat(row[config.zAxis]) || 0
      ]);

      // Calculate grid dimensions for responsive labeling
      const containerWidth = 600; // Approximate chart container width
      const containerHeight = 320; // Approximate chart container height
      const cellWidth = (containerWidth * 0.7) / xCategories.length; // Account for margins
      const cellHeight = (containerHeight * 0.7) / yCategories.length;
      
      // Determine if labels should be shown based on user preference and size
      let showLabels = false;
      const minCellSizeForLabels = 45;
      
      if (config.showHeatmapLabels === 'always') {
        showLabels = true;
      } else if (config.showHeatmapLabels === 'never') {
        showLabels = false;
      } else { // 'auto'
        showLabels = cellWidth >= minCellSizeForLabels && 
                    cellHeight >= minCellSizeForLabels && 
                    xCategories.length <= 12 && 
                    yCategories.length <= 10;
      }
      
      const fontSize = Math.max(8, Math.min(11, Math.min(cellWidth, cellHeight) * 0.25));

      return {
        ...baseOption,
        tooltip: {
          position: 'top',
          formatter: function(params) {
            return `${config.xAxis}: ${xCategories[params.data[0]]}<br/>` +
                   `${config.yAxis}: ${yCategories[params.data[1]]}<br/>` +
                   `${config.zAxis}: ${params.data[2]}`;
          }
        },
        grid: {
          left: '10%',
          right: '15%',
          top: '15%',
          bottom: '15%'
        },
        xAxis: {
          type: 'category',
          data: xCategories,
          axisLabel: {
            fontSize: Math.min(11, fontSize + 1),
            rotate: xCategories.length > 8 ? 45 : 0,
            interval: 0
          },
          splitArea: { 
            show: true,
            areaStyle: {
              color: ['#f7f7f7', '#ffffff']
            }
          }
        },
        yAxis: {
          type: 'category',
          data: yCategories,
          axisLabel: {
            fontSize: Math.min(11, fontSize + 1),
            interval: 0
          },
          splitArea: { 
            show: true,
            areaStyle: {
              color: ['#f7f7f7', '#ffffff']
            }
          }
        },
        visualMap: {
          min: Math.min(...heatmapData.map(d => d[2])),
          max: Math.max(...heatmapData.map(d => d[2])),
          calculable: true,
          orient: 'vertical',
          left: 'right',
          top: 'center',
          show: true,
          dimension: 2,
          inRange: {
            color: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
          },
          text: ['High', 'Low'],
          textStyle: {
            fontSize: 10
          }
        },
        series: [{
          name: config.zAxis,
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: showLabels,
            position: config.showHeatmapLabels === 'always' && (cellWidth < 40 || cellHeight < 30) ? 'outside' : 'inside',
            fontSize: config.showHeatmapLabels === 'always' && (cellWidth < 40 || cellHeight < 30) ? 
                     Math.max(6, fontSize - 2) : fontSize,
            fontWeight: 'normal',
            distance: config.showHeatmapLabels === 'always' && (cellWidth < 40 || cellHeight < 30) ? 3 : 0,
            color: function(params) {
              // For outside labels, use consistent dark color
              if (config.showHeatmapLabels === 'always' && (cellWidth < 40 || cellHeight < 30)) {
                return '#333333';
              }
              // Use white text on dark cells, dark text on light cells for inside labels
              const value = params.value[2];
              const max = Math.max(...heatmapData.map(d => d[2]));
              const min = Math.min(...heatmapData.map(d => d[2]));
              const ratio = (value - min) / (max - min);
              return ratio > 0.5 ? '#ffffff' : '#333333';
            },
            formatter: function(params) {
              const value = params.value[2];
              // For very small cells, use even more compact notation
              const isVerySmall = cellWidth < 35 || cellHeight < 25;
              
              if (isVerySmall && config.showHeatmapLabels === 'always') {
                if (Math.abs(value) >= 1000000) {
                  return Math.round(value / 1000000) + 'M';
                } else if (Math.abs(value) >= 1000) {
                  return Math.round(value / 1000) + 'k';
                } else if (Math.abs(value) >= 100) {
                  return Math.round(value).toString();
                } else {
                  return Math.round(value * 10) / 10; // One decimal max
                }
              } else {
                if (Math.abs(value) >= 1000000) {
                  return (value / 1000000).toFixed(1) + 'M';
                } else if (Math.abs(value) >= 1000) {
                  return (value / 1000).toFixed(1) + 'k';
                } else if (Math.abs(value) >= 100) {
                  return Math.round(value).toString();
                } else if (Math.abs(value) >= 1) {
                  return value.toFixed(1);
                } else {
                  return value.toFixed(2);
                }
              }
            }
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 1,
            borderRadius: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };
    }

    if (['scatter', 'bubble'].includes(config.chartType)) {
      const scatterData = data.map(row => {
        const point = [
          parseFloat(row[config.xAxis]) || 0,
          parseFloat(row[config.yAxis]) || 0
        ];
        
        if (config.chartType === 'bubble' && config.zAxis) {
          point.push(parseFloat(row[config.zAxis]) || 1);
        }
        
        return point;
      });

      return {
        ...baseOption,
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            let tooltip = `${config.xAxis}: ${params.data[0]}<br/>${config.yAxis}: ${params.data[1]}`;
            if (config.chartType === 'bubble' && params.data[2] !== undefined) {
              tooltip += `<br/>${config.zAxis}: ${params.data[2]}`;
            }
            return tooltip;
          }
        },
        xAxis: {
          type: 'value',
          name: config.xAxis,
          axisLabel: { fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          name: config.yAxis,
          axisLabel: { fontSize: 10 }
        },
        series: [{
          name: config.title,
          type: 'scatter',
          data: scatterData,
          symbolSize: function(data) {
            return config.chartType === 'bubble' && data[2] !== undefined 
              ? Math.sqrt(data[2]) * 2 
              : 8;
          },
          itemStyle: {
            color: '#3B82F6'
          }
        }]
      };
    }

    // For standard chart types (line, bar, column, area)
    const xData = data.map((row, index) => {
      const value = row[config.xAxis];
      
      // Handle undefined/null values
      if (value === undefined || value === null || value === '') {
        if (index === 0) {
          // Only show warning once and show available columns
          console.warn(`Missing column '${config.xAxis}' in data. Available columns:`, Object.keys(row));
          console.warn('Sample row:', row);
        }
        return `Row ${index + 1}`;
      }
      
      // Check if this looks like a datetime field
      if (config.xAxis.toLowerCase().includes('date') || config.xAxis.toLowerCase().includes('time')) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // Format datetime based on data pattern
            if (value && typeof value === 'string' && value.includes(':')) {
              // Has time component - show date and time
              return date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            } else {
              // Just date
              return date.toLocaleDateString();
            }
          } else {
            console.warn('Invalid date value:', value);
            return String(value);
          }
        } catch (e) {
          console.warn('Failed to parse datetime:', value, e);
          return String(value);
        }
      }
      
      return String(value);
    });
    const yData = data.map(row => parseFloat(row[config.yAxis]) || 0);

    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: {
          rotate: (config.xAxis.toLowerCase().includes('date') || config.xAxis.toLowerCase().includes('time')) ? 45 : 
                  (xData.length > 10 ? 45 : 0),
          fontSize: 10,
          interval: xData.length > 20 ? 'auto' : 0  // Auto-skip labels for large datasets
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 }
      },
      series: [{
        name: config.yAxis,
        type: config.chartType === 'column' ? 'bar' : config.chartType,
        data: yData,
        smooth: config.chartType === 'line',
        itemStyle: {
          color: '#3B82F6'
        },
        areaStyle: config.chartType === 'area' ? {} : undefined
      }]
    };
  };

  const handleSave = () => {
    console.log('=== SAVING CHART CONFIGURATION ===');
    console.log('Config being saved:', config);
    console.log('Cell ID:', cell.id);
    console.log('Available columns:', getAvailableColumns());
    console.log('CSV data rows:', state.csvData.length);
    console.log('Chart instance exists:', !!chartInstance);
    
    dispatch({
      type: ActionTypes.UPDATE_CELL,
      payload: {
        id: cell.id,
        updates: { 
          ...config,
          executed: true, // Mark as executed since we're using local rendering
          executionTime: '0.1s'
        }
      }
    });
    dispatch({
      type: ActionTypes.SET_EDITING_CELL,
      payload: null
    });
    setIsConfiguring(false);
    
    console.log('=== CONFIGURATION SAVE COMPLETE ===');
    
    // Force a re-render after a short delay
    setTimeout(() => {
      if (chartInstance && state.csvData.length > 0) {
        console.log('=== FORCING CHART RE-RENDER AFTER SAVE ===');
        renderChart();
      }
    }, 100);
  };

  const handleCancel = () => {
    // Reset config to cell data
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
      limit: cell.limit || 100,
      showHeatmapLabels: cell.showHeatmapLabels !== undefined ? cell.showHeatmapLabels : 'auto'
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

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${state.selectedCellId === cell.id ? 'ring-2 ring-blue-500' : ''}`}
         onClick={() => dispatch({ type: ActionTypes.SET_SELECTED_CELL, payload: cell.id })}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Icon name="BarChart3" className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">{cell.title}</span>
          </div>
          {cell.executed && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <Icon name="CheckCircle" className="w-3 h-3" />
              <span>{cell.executionTime}</span>
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
              availableColumns={getAvailableColumns()}
              chartTypeOptions={chartTypeOptions}
              aggregationOptions={aggregationOptions}
              onSave={handleSave}
              onCancel={handleCancel}
              cell={cell}
              executeCell={executeCell}
              dispatch={dispatch}
              ActionTypes={ActionTypes}
            />
          ) : (
            <>
              <div>
                {chartError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Chart Configuration Error</h3>
                        <p className="text-sm text-red-700 mt-1">{chartError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Chart container - always render for proper initialization */}
                <div 
                  className="w-full border border-gray-200 rounded bg-white" 
                  ref={chartRef} 
                  style={{ 
                    height: '320px', 
                    minHeight: '320px',
                    width: '100%',
                    backgroundColor: '#ffffff',
                    display: (config.xAxis && config.yAxis) ? 'block' : 'none'
                  }} 
                />
                
                {/* Chart info and controls - only show when configured */}
                {(config.xAxis && config.yAxis) && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Data:</span> {config.dataSource === 'csv' ? 'CSV Data' : 'Custom Query'} • 
                      <span className="font-medium"> Type:</span> {chartTypeOptions.find(opt => opt.value === config.chartType)?.label} • 
                      <span className="font-medium"> X:</span> {config.xAxis} • 
                      <span className="font-medium"> Y:</span> {config.yAxis}
                      {config.groupBy && <><span className="font-medium"> • Group:</span> {config.groupBy}</>}
                      {config.aggregation !== 'none' && <><span className="font-medium"> • Agg:</span> {config.aggregation}</>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          console.log('Manual refresh triggered');
                          if (chartInstance) {
                            chartInstance.resize();
                            renderChart();
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Refresh Chart
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
                )}
                
                {/* Show configuration prompt when not configured */}
                {!(config.xAxis && config.yAxis) && (
                <div className="h-64 bg-gray-50 rounded border flex flex-col items-center justify-center p-4">
                  <div className="text-center text-gray-500 mb-4">
                    <Icon name="BarChart3" className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Chart not configured</p>
                    <p className="text-xs mt-1">Click "Configure" to set up your chart</p>
                  </div>
                  
                  {/* Debug info */}
                  <div className="text-xs text-gray-400 max-w-full overflow-hidden">
                    <p><strong>Debug Info:</strong></p>
                    <p>Data Source: {config.dataSource}</p>
                    <p>CSV Data: {state.csvData?.length || 0} rows</p>
                    <p>Query Results: {cell.queryResults?.length || 0} rows</p>
                    <p>Available Columns: {getAvailableColumns().length > 0 ? getAvailableColumns().join(', ') : 'None'}</p>
                    <p>X-Axis: {config.xAxis || 'Not set'}</p>
                    <p>Y-Axis: {config.yAxis || 'Not set'}</p>
                  </div>
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

// Chart Configuration Component
function ChartConfiguration({ config, onConfigChange, availableColumns, chartTypeOptions, aggregationOptions, onSave, onCancel, cell, executeCell, dispatch, ActionTypes }) {
  const columnOptions = availableColumns.map(col => ({ value: col, label: col }));
  const sortOptions = [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }];

  const renderDropdown = (label, field, options, placeholder = "Select option") => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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

  const renderInput = (label, field, type = "text", placeholder = "") => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
      {/* Chart Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {renderInput("Chart Title", "title", "text", "Enter chart title")}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {chartTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onConfigChange('chartType', option.value)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    config.chartType === option.value 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
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
                CSV Data
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
              <div className="mt-2 flex items-center justify-between">
                {config.query && (
                  <button
                    onClick={async () => {
                      // First save the query to the cell
                      dispatch({
                        type: ActionTypes.UPDATE_CELL,
                        payload: {
                          id: cell.id,
                          updates: { query: config.query }
                        }
                      });
                      // Then execute the cell
                      await executeCell(cell.id);
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                  >
                    <Icon name="Play" className="w-3 h-3" />
                    <span>Execute Query</span>
                  </button>
                )}
                <div className="flex-1 ml-3">
                  {availableColumns.length === 0 && config.dataSource === 'query' ? (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      <Icon name="AlertTriangle" className="w-4 h-4 inline mr-1" />
                      {config.query ? 'Click "Execute Query" to get column options' : 'Enter a query to get started'}
                    </div>
                  ) : config.dataSource === 'query' && availableColumns.length > 0 ? (
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      <Icon name="CheckCircle" className="w-4 h-4 inline mr-1" />
                      Query results available. Available columns: {availableColumns.join(', ')}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Axis Configuration - Dynamic based on chart type */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.chartType === 'pie' ? (
            <>
              {renderDropdown("Category Column", "xAxis", columnOptions, "Select category column")}
              {renderDropdown("Value Column", "yAxis", columnOptions, "Select value column")}
            </>
          ) : config.chartType === 'heatmap' ? (
            <>
              {renderDropdown("X Axis (Categories)", "xAxis", columnOptions, "Select X axis column")}
              {renderDropdown("Y Axis (Categories)", "yAxis", columnOptions, "Select Y axis column")}
              {renderDropdown("Value Column", "zAxis", columnOptions, "Select value column for heat intensity")}
            </>
          ) : (
            <>
              {renderDropdown("X Axis", "xAxis", columnOptions, "Select X axis column")}
              {renderDropdown("Y Axis", "yAxis", columnOptions, "Select Y axis column")}
              {['bubble', 'scatter'].includes(config.chartType) && 
                renderDropdown("Size Column", "zAxis", columnOptions, "Select column for bubble size")
              }
            </>
          )}
        </div>
        
        {/* Chart-specific hints */}
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <div className="flex items-start">
            <Icon name="Info" className="w-4 h-4 text-blue-500 mt-0.5 mr-2" />
            <div className="text-sm text-blue-700">
              {config.chartType === 'pie' && (
                <p><strong>Pie Chart:</strong> Category column provides slice labels, Value column determines slice sizes</p>
              )}
              {config.chartType === 'heatmap' && (
                <p><strong>Heatmap:</strong> X and Y axes create the grid, Value column determines color intensity</p>
              )}
              {config.chartType === 'heatmap' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-blue-700 mb-2">Label Display</label>
                  <select
                    value={config.showHeatmapLabels}
                    onChange={(e) => onConfigChange('showHeatmapLabels', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="auto">Auto (smart based on size)</option>
                    <option value="always">Always show labels</option>
                    <option value="never">Never show labels</option>
                  </select>
                  <p className="text-xs text-blue-600 mt-1">
                    {config.showHeatmapLabels === 'auto' && 'Labels shown when cells are large enough'}
                    {config.showHeatmapLabels === 'always' && 'Labels always displayed (may overlap on small cells)'}
                    {config.showHeatmapLabels === 'never' && 'Labels hidden, use tooltip to see values'}
                  </p>
                </div>
              )}
              {['line', 'area', 'bar', 'column'].includes(config.chartType) && (
                <p><strong>{chartTypeOptions.find(opt => opt.value === config.chartType)?.label}:</strong> X axis for categories/time, Y axis for numeric values</p>
              )}
              {['scatter', 'bubble'].includes(config.chartType) && (
                <p><strong>{chartTypeOptions.find(opt => opt.value === config.chartType)?.label}:</strong> Both X and Y should be numeric columns{config.chartType === 'bubble' ? ', Size column scales bubble sizes' : ''}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Processing - Only show relevant options */}
      {!['pie', 'heatmap'].includes(config.chartType) && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Processing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDropdown("Group By", "groupBy", columnOptions, "Group data by column (optional)")}
            {config.groupBy && renderDropdown("Aggregation", "aggregation", aggregationOptions, "Select aggregation method")}
          </div>
          {config.groupBy && (
            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
              <Icon name="AlertTriangle" className="w-4 h-4 inline mr-1" />
              Grouping will combine rows with the same {config.groupBy} value using {aggregationOptions.find(opt => opt.value === config.aggregation)?.label.toLowerCase()} aggregation
            </div>
          )}
        </div>
      )}

      {/* Visual Settings */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Visual Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDropdown("Color By", "colorBy", columnOptions, "Color series by column")}
          {['bubble'].includes(config.chartType) && 
            renderDropdown("Size By", "sizeBy", columnOptions, "Size bubbles by column")
          }
          {renderDropdown("Sort By", "sortBy", columnOptions, "Sort data by column")}
          {renderDropdown("Sort Order", "sortOrder", sortOptions)}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderInput("Filter Condition", "filterCondition", "text", "WHERE clause (optional)")}
          {renderInput("Row Limit", "limit", "number", "100")}
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
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Icon name="Save" className="w-4 h-4" />
          <span>Apply Configuration</span>
        </button>
      </div>
    </div>
  );
}