// Concrete ECharts service for reliable chart management
class ChartService {
  constructor() {
    this.instances = new Map();
    this.observers = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.defaultTheme = {
      color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'],
      backgroundColor: '#ffffff',
      textStyle: {
        color: '#374151',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
      },
      title: {
        textStyle: {
          color: '#1F2937',
          fontFamily: 'DM Serif Display, serif',
          fontWeight: 'bold'
        }
      }
    };
  }

  /**
   * Initialize ECharts instance with proper error handling
   */
  async initChart(containerId, container) {
    try {
      console.log(`[ChartService] Initializing chart for container: ${containerId}`);
      
      // Ensure ECharts is available
      if (!window.echarts) {
        await this.waitForECharts();
      }

      // Dispose existing instance if any
      this.disposeChart(containerId);

      // Validate container
      if (!this.validateContainer(container)) {
        throw new Error('Invalid container element');
      }

      // Prepare container
      this.prepareContainer(container);

      // Create instance with retries
      const instance = await this.createInstanceWithRetry(container, containerId);
      
      if (!instance) {
        throw new Error('Failed to create chart instance after retries');
      }

      // Store instance
      this.instances.set(containerId, instance);
      
      // Setup resize observer
      this.setupResizeObserver(containerId, container, instance);

      console.log(`[ChartService] Chart initialized successfully: ${containerId}`);
      return instance;

    } catch (error) {
      console.error(`[ChartService] Failed to initialize chart ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for ECharts to be available
   */
  async waitForECharts(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (window.echarts) {
        resolve(window.echarts);
        return;
      }

      let attempts = 0;
      const maxAttempts = timeout / 100;

      const check = () => {
        if (window.echarts) {
          resolve(window.echarts);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('ECharts not available after timeout'));
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  }

  /**
   * Validate container element
   */
  validateContainer(container) {
    if (!container || !container.nodeType) {
      return false;
    }

    if (!container.offsetParent && container !== document.body) {
      console.warn('[ChartService] Container is not visible');
    }

    return true;
  }

  /**
   * Prepare container for chart initialization
   */
  prepareContainer(container) {
    // Ensure container has proper dimensions
    const computedStyle = window.getComputedStyle(container);
    
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      container.style.width = container.style.width || '100%';
      container.style.height = container.style.height || '320px';
    }

    // Ensure visibility
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    // Clear any existing content
    container.innerHTML = '';

    console.log(`[ChartService] Container prepared:`, {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: computedStyle.display,
      visibility: computedStyle.visibility
    });
  }

  /**
   * Create ECharts instance with retry logic
   */
  async createInstanceWithRetry(container, containerId, attempt = 1) {
    try {
      console.log(`[ChartService] Creating instance attempt ${attempt}/${this.maxRetries}`);
      
      // Force layout recalculation
      container.offsetHeight; // Trigger reflow
      
      const instance = window.echarts.init(container, null, {
        renderer: 'canvas',
        useDirtyRect: false,
        width: container.offsetWidth,
        height: container.offsetHeight
      });

      // Verify instance creation
      if (!instance || !this.verifyInstance(container, instance)) {
        throw new Error('Instance creation failed verification');
      }

      return instance;

    } catch (error) {
      console.warn(`[ChartService] Instance creation attempt ${attempt} failed:`, error);
      
      if (attempt < this.maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        
        // Re-prepare container
        this.prepareContainer(container);
        
        return this.createInstanceWithRetry(container, containerId, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Verify instance was created successfully
   */
  verifyInstance(container, instance) {
    try {
      // Check instance methods
      if (typeof instance.setOption !== 'function') {
        return false;
      }

      // Check canvas creation (after a brief delay)
      setTimeout(() => {
        const canvas = container.querySelector('canvas');
        if (!canvas) {
          console.warn('[ChartService] No canvas found after instance creation');
        }
      }, 50);

      return true;
    } catch (error) {
      console.error('[ChartService] Instance verification failed:', error);
      return false;
    }
  }

  /**
   * Setup resize observer for responsive behavior
   */
  setupResizeObserver(containerId, container, instance) {
    if (this.observers.has(containerId)) {
      this.observers.get(containerId).disconnect();
    }

    const observer = new ResizeObserver((entries) => {
      if (instance && !instance.isDisposed()) {
        try {
          instance.resize();
        } catch (error) {
          console.warn(`[ChartService] Resize failed for ${containerId}:`, error);
        }
      }
    });

    observer.observe(container);
    this.observers.set(containerId, observer);
  }

  /**
   * Render chart with proper error handling
   */
  async renderChart(containerId, chartData, config) {
    try {
      console.log(`[ChartService] Rendering chart: ${containerId}`);
      
      const instance = this.instances.get(containerId);
      if (!instance || instance.isDisposed()) {
        throw new Error('Chart instance not available');
      }

      // Validate data
      if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
        throw new Error('Invalid chart data');
      }

      // Generate chart option
      const option = this.generateChartOption(chartData, config);
      
      // Apply theme
      const themedOption = this.applyTheme(option);
      
      // Set option with loading indicator
      instance.showLoading('default', {
        text: 'Rendering...',
        color: '#3B82F6',
        maskColor: 'rgba(255, 255, 255, 0.8)'
      });

      // Set option
      instance.setOption(themedOption, true);
      
      // Hide loading
      instance.hideLoading();

      console.log(`[ChartService] Chart rendered successfully: ${containerId}`);
      return true;

    } catch (error) {
      console.error(`[ChartService] Render failed for ${containerId}:`, error);
      this.showError(containerId, error.message);
      return false;
    }
  }

  /**
   * Generate ECharts option based on chart type and data
   */
  generateChartOption(data, config) {
    const generators = {
      line: this.generateLineChart.bind(this),
      bar: this.generateBarChart.bind(this),
      column: this.generateColumnChart.bind(this),
      area: this.generateAreaChart.bind(this),
      pie: this.generatePieChart.bind(this),
      scatter: this.generateScatterChart.bind(this),
      bubble: this.generateBubbleChart.bind(this),
      heatmap: this.generateHeatmapChart.bind(this)
    };

    const generator = generators[config.chartType];
    if (!generator) {
      throw new Error(`Unsupported chart type: ${config.chartType}`);
    }

    return generator(data, config);
  }

  /**
   * Apply theme to chart option
   */
  applyTheme(option) {
    return {
      ...option,
      color: this.defaultTheme.color,
      backgroundColor: this.defaultTheme.backgroundColor,
      textStyle: this.defaultTheme.textStyle,
      title: {
        ...option.title,
        textStyle: {
          ...this.defaultTheme.title.textStyle,
          ...option.title?.textStyle
        }
      }
    };
  }

  /**
   * Show error message in chart
   */
  showError(containerId, message) {
    const instance = this.instances.get(containerId);
    if (!instance || instance.isDisposed()) return;

    instance.setOption({
      title: {
        text: 'Chart Error',
        left: 'center',
        top: 'center',
        textStyle: { 
          color: '#EF4444', 
          fontSize: 18, 
          fontWeight: 'bold' 
        }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: '60%',
        style: {
          text: message,
          textAlign: 'center',
          fill: '#6B7280',
          fontSize: 14
        }
      }
    }, true);
  }

  /**
   * Generate line chart option
   */
  generateLineChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(row => row[config.xAxis])
      },
      yAxis: { type: 'value' },
      series: [{
        name: config.yAxis,
        type: 'line',
        data: data.map(row => parseFloat(row[config.yAxis]) || 0),
        smooth: true
      }]
    };
  }

  /**
   * Generate bar chart option
   */
  generateBarChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: data.map(row => row[config.xAxis])
      },
      series: [{
        name: config.yAxis,
        type: 'bar',
        data: data.map(row => parseFloat(row[config.yAxis]) || 0)
      }]
    };
  }

  /**
   * Generate column chart option
   */
  generateColumnChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(row => row[config.xAxis])
      },
      yAxis: { type: 'value' },
      series: [{
        name: config.yAxis,
        type: 'bar',
        data: data.map(row => parseFloat(row[config.yAxis]) || 0)
      }]
    };
  }

  /**
   * Generate area chart option
   */
  generateAreaChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(row => row[config.xAxis])
      },
      yAxis: { type: 'value' },
      series: [{
        name: config.yAxis,
        type: 'line',
        data: data.map(row => parseFloat(row[config.yAxis]) || 0),
        areaStyle: {},
        smooth: true
      }]
    };
  }

  /**
   * Generate pie chart option
   */
  generatePieChart(data, config) {
    return {
      title: { text: config.title },
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
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  }

  /**
   * Generate scatter chart option
   */
  generateScatterChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: config.xAxis },
      yAxis: { type: 'value', name: config.yAxis },
      series: [{
        type: 'scatter',
        data: data.map(row => [
          parseFloat(row[config.xAxis]) || 0,
          parseFloat(row[config.yAxis]) || 0
        ])
      }]
    };
  }

  /**
   * Generate bubble chart option
   */
  generateBubbleChart(data, config) {
    return {
      title: { text: config.title },
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: config.xAxis },
      yAxis: { type: 'value', name: config.yAxis },
      series: [{
        type: 'scatter',
        data: data.map(row => [
          parseFloat(row[config.xAxis]) || 0,
          parseFloat(row[config.yAxis]) || 0,
          parseFloat(row[config.zAxis]) || 1
        ]),
        symbolSize: function(data) {
          return Math.sqrt(data[2]) * 3;
        }
      }]
    };
  }

  /**
   * Generate heatmap chart option
   */
  generateHeatmapChart(data, config) {
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
    
    // Much more conservative label display rules
    const minCellSizeForLabels = 45; // Minimum size needed for readable labels
    const showLabels = cellWidth >= minCellSizeForLabels && 
                      cellHeight >= minCellSizeForLabels && 
                      xCategories.length <= 12 && 
                      yCategories.length <= 10;
    
    const fontSize = Math.max(8, Math.min(11, Math.min(cellWidth, cellHeight) * 0.25));

    return {
      title: { text: config.title },
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
        right: '10%',
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
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: showLabels,
          position: 'inside',
          fontSize: fontSize,
          fontWeight: 'normal',
          color: function(params) {
            // Use white text on dark cells, dark text on light cells
            const value = params.value[2];
            const max = Math.max(...heatmapData.map(d => d[2]));
            const min = Math.min(...heatmapData.map(d => d[2]));
            const ratio = (value - min) / (max - min);
            return ratio > 0.5 ? '#ffffff' : '#333333';
          },
          formatter: function(params) {
            const value = params.value[2];
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

  /**
   * Dispose chart instance
   */
  disposeChart(containerId) {
    const instance = this.instances.get(containerId);
    if (instance) {
      try {
        instance.dispose();
      } catch (error) {
        console.warn(`[ChartService] Error disposing chart ${containerId}:`, error);
      }
      this.instances.delete(containerId);
    }

    const observer = this.observers.get(containerId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(containerId);
    }

    this.retryAttempts.delete(containerId);
  }

  /**
   * Dispose all charts
   */
  disposeAll() {
    for (const containerId of this.instances.keys()) {
      this.disposeChart(containerId);
    }
  }

  /**
   * Get chart instance
   */
  getInstance(containerId) {
    return this.instances.get(containerId);
  }

  /**
   * Check if chart exists and is valid
   */
  hasValidChart(containerId) {
    const instance = this.instances.get(containerId);
    return instance && !instance.isDisposed();
  }
}

// Export singleton instance
export const chartService = new ChartService();