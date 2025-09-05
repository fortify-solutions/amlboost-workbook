import { useEffect, useCallback, useRef } from 'react';
import { useNotebook } from '../stores/NotebookContext';
import { apiClient } from '../services/apiClient';
import { initializeComputedStatesService, computedStatesService } from '../services/computedStates';

export function useAPILoader() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const hasAutoExecuted = useRef(false);
  const isLoading = useRef(false);
  const hasLoaded = useRef(false);
  const currentDatasetId = useRef(null);

  const executeStateCell = useCallback(async (cellId) => {
    const cell = state.cells.find(c => c.id === cellId);
    
    if (cell && cell.type === 'state' && cell.states && state.csvData.length > 0) {
      const startTime = Date.now();
      
      try {
        // Note: State cells might need backend support for computed states
        // For now, maintaining compatibility with existing computed states service
        if (!computedStatesService) {
          console.log('Initializing computedStatesService with API client');
          initializeComputedStatesService(apiClient);
        }
        
        if (!computedStatesService) {
          throw new Error('computedStatesService could not be initialized');
        }
        
        console.log('Executing state cell with', cell.states.length, 'states');
        
        // Apply each computed state to the dataset
        let currentData = state.csvData;
        for (const stateConfig of cell.states) {
          if (stateConfig.persistent) {
            console.log(`Computing and persisting state: ${stateConfig.name}`, stateConfig);
            
            // Use the computedStatesService to apply the state
            const updatedData = await computedStatesService.persistStateToDataset(currentData, stateConfig);
            currentData = updatedData;
            
            console.log('State applied, data now has', Object.keys(currentData[0] || {}).length, 'columns');
            
            // Update the API client with the new data (this would need backend support)
            // For now, just update local state
            dispatch({ type: ActionTypes.SET_CSV_DATA, payload: currentData });
          }
        }
        
        const executionTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        
        dispatch({
          type: ActionTypes.EXECUTE_CELL,
          payload: {
            cellId,
            success: true,
            executionTime,
            results: [],
            rowCount: 0
          }
        });
        
      } catch (error) {
        console.error('Failed to execute state cell:', error);
        const executionTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        
        dispatch({
          type: ActionTypes.EXECUTE_CELL,
          payload: {
            cellId,
            success: false,
            executionTime,
            error: error.message
          }
        });
      }
    }
  }, [state.cells, state.csvData, dispatch, ActionTypes]);

  const executeCell = useCallback(async (cellId, page = 1) => {
    const cell = state.cells.find(c => c.id === cellId);
    
    if (cell && (cell.type === 'data' || cell.type === 'chart') && cell.query) {
      console.log(`Executing ${cell.type} cell ${cellId}: ${cell.title}`);
      console.log('Query:', cell.query);
      
      const startTime = Date.now();
      // Use larger page size to showcase backend scalability
      const pageSize = cell.type === 'chart' ? 10000 : 5000; // Charts can handle more data points
      const result = await apiClient.execute(cell.query, page, pageSize);
      const executionTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      
      console.log(`Query result:`, result.success, 'total rows:', result.rowCount);
      
      if (result.success) {
        const resultColumns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
        
        dispatch({
          type: ActionTypes.EXECUTE_CELL,
          payload: {
            cellId,
            success: true,
            executionTime,
            results: result.data,
            rowCount: result.rowCount,
            columns: resultColumns,
            visibleColumns: resultColumns,
            pagination: result.pagination,
            cached: result.cached
          }
        });
      } else {
        dispatch({
          type: ActionTypes.EXECUTE_CELL,
          payload: {
            cellId,
            success: false,
            executionTime,
            error: result.error
          }
        });
      }
    } else if (cell && cell.type === 'state') {
      await executeStateCell(cellId);
    }
  }, [state.cells, dispatch, ActionTypes, executeStateCell]);

  // Load more pages for a specific cell (for virtual scrolling)
  const loadMorePages = useCallback(async (cellId, page) => {
    const cell = state.cells.find(c => c.id === cellId);
    
    if (cell && cell.query) {
      try {
        // Use larger page size for virtual scrolling of large datasets
        const result = await apiClient.execute(cell.query, page, 5000);
        
        if (result.success) {
          // Append new data to existing results
          dispatch({
            type: ActionTypes.APPEND_CELL_RESULTS,
            payload: {
              cellId,
              newResults: result.data,
              page
            }
          });
          
          return result.data;
        }
      } catch (error) {
        console.error(`Failed to load page ${page} for cell ${cellId}:`, error);
      }
    }
    
    return [];
  }, [state.cells, dispatch, ActionTypes]);

  useEffect(() => {
    // Initialize API connection and check for existing data
    if (!hasLoaded.current && !isLoading.current) {
      console.log('Initiating API connection and data check...');
      loadInitialData();
    }
  }, []); // Empty dependency array - only run on mount

  // Auto-execute state cells first, then data cells when data is available
  useEffect(() => {
    console.log('useEffect triggered - csvData.length:', state.csvData.length, 'hasAutoExecuted:', hasAutoExecuted.current);
    
    const executeCellsSequentially = async () => {
      console.log('executeCellsSequentially called');
      
      if (state.csvData.length > 0 && !hasAutoExecuted.current && !isLoading.current) {
        console.log('Starting auto-execution process');
        hasAutoExecuted.current = true;
        
        console.log('Total cells found:', state.cells.length);
        console.log('Cell types:', state.cells.map(c => `${c.id}:${c.type}`));
        
        // First, execute state cells to compute and persist states
        const stateCellsToExecute = state.cells.filter(cell => 
          cell.type === 'state' && 
          cell.states &&
          cell.states.some(s => s.persistent)
        );
        
        // Then, execute data cells and chart cells that have queries
        const dataCellsToExecute = state.cells.filter(cell => 
          cell.type === 'data' && 
          (!cell.queryResults || cell.queryResults.length === 0) &&
          cell.query
        );
        
        const chartCellsToExecute = state.cells.filter(cell =>
          cell.type === 'chart' &&
          (!cell.queryResults || cell.queryResults.length === 0) &&
          cell.query
        );
        
        console.log('Auto-executing state cells:', stateCellsToExecute.length);
        console.log('Auto-executing data cells:', dataCellsToExecute.length);
        console.log('Auto-executing chart cells:', chartCellsToExecute.length);
        
        // Execute state cells first - wait for each to complete
        if (stateCellsToExecute.length > 0) {
          console.log('Will execute state cells:', stateCellsToExecute.map(c => `${c.id}: ${c.title}`));
          for (const cell of stateCellsToExecute) {
            console.log(`Executing state cell ${cell.id}: ${cell.title}`);
            await executeStateCell(cell.id);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log('All state cells completed, now executing data cells');
        }
        
        // Then execute data cells and chart cells
        const allQueryCells = [...dataCellsToExecute, ...chartCellsToExecute];
        if (allQueryCells.length > 0) {
          for (const cell of allQueryCells) {
            executeCell(cell.id);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
    };

    executeCellsSequentially();
  }, [state.csvData.length]);

  const loadInitialData = useCallback(async () => {
    if (isLoading.current || hasLoaded.current) {
      console.log('Data loading already in progress or completed, skipping...');
      return;
    }
    
    isLoading.current = true;
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    
    const startTime = Date.now();
    const minLoadTime = 1000; // 1 second minimum
    
    try {
      // Initialize API client
      const connected = await apiClient.initialize();
      
      if (!connected) {
        throw new Error('Could not connect to backend. Please ensure the backend server is running.');
      }
      
      // Get basic statistics to see if we have data
      const stats = await apiClient.getStats();
      
      // Store backend stats in global state for UI display
      dispatch({ type: ActionTypes.SET_BACKEND_STATS, payload: stats });
      
      if (stats.rowCount > 0) {
        // We have existing data in the backend - no need to load all into memory!
        console.log(`🎯 Connected to backend with ${parseInt(stats.rowCount).toLocaleString()} total transactions`);
        console.log(`📊 Dataset covers ${stats.columns?.length || 'multiple'} columns`);
        
        // Get column info for UI purposes
        const columnInfo = await apiClient.getColumnInfo();
        
        // Create a representative sample for computed states compatibility
        // But the real power is in the backend queries!
        const sampleData = await apiClient.getSample(100); // Just a tiny sample for compatibility
        
        // Ensure minimum loading time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // Update state with minimal sample (backend handles the real queries)
        dispatch({ type: ActionTypes.SET_CSV_DATA, payload: sampleData });
        
        // Set column types if available
        if (columnInfo && Object.keys(columnInfo).length > 0) {
          dispatch({ type: ActionTypes.SET_COLUMN_TYPES, payload: columnInfo });
        }
        
        hasLoaded.current = true;
        
        console.log(`✅ Backend connected successfully! Full dataset (${parseInt(stats.rowCount).toLocaleString()} rows) available for queries.`);
        console.log(`💡 Pro tip: Data cells and charts now query the full dataset dynamically!`);
      } else {
        console.log('No existing data found. Please upload a CSV file to get started.');
        
        // Still mark as loaded so we don't keep trying
        hasLoaded.current = true;
        
        // Set empty state
        dispatch({ type: ActionTypes.SET_CSV_DATA, payload: [] });
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      
      // Set empty state on error
      dispatch({ type: ActionTypes.SET_CSV_DATA, payload: [] });
      hasLoaded.current = true;
      
    } finally {
      isLoading.current = false;
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [dispatch, ActionTypes]);

  // Upload new CSV data
  const uploadCSV = useCallback(async (file, name) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      // Upload file
      const uploadResult = await apiClient.uploadCSV(file, name);
      currentDatasetId.current = uploadResult.datasetId;
      
      console.log('File uploaded successfully:', uploadResult);
      
      // Poll for completion
      const pollStatus = async () => {
        if (!currentDatasetId.current) return;
        
        try {
          const status = await apiClient.getUploadStatus(currentDatasetId.current);
          
          console.log('Upload status:', status);
          
          if (status.status === 'completed') {
            // Reload data after successful upload
            hasLoaded.current = false;
            await loadInitialData();
          } else if (status.status === 'error') {
            throw new Error(status.error_message || 'Upload failed');
          } else if (status.status === 'processing') {
            // Continue polling
            setTimeout(pollStatus, 2000);
          }
          
        } catch (error) {
          console.error('Error checking upload status:', error);
          dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        }
      };
      
      // Start polling
      setTimeout(pollStatus, 1000);
      
      return uploadResult;
      
    } catch (error) {
      console.error('Error uploading CSV:', error);
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      throw error;
    }
  }, [dispatch, ActionTypes, loadInitialData]);

  return {
    loading: state.loading,
    csvData: state.csvData,
    executeCell,
    loadMorePages,
    reloadData: loadInitialData,
    uploadCSV,
    connected: apiClient.isInitialized
  };
}