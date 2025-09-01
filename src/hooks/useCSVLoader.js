import { useEffect, useCallback, useRef } from 'react';
import { useNotebook } from '../stores/NotebookContext';
import { csvLoader } from '../services/csvLoader';
import { sqliteEngine } from '../services/sqliteEngine';
import { initializeComputedStatesService, computedStatesService } from '../services/computedStates';

export function useCSVLoader() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const hasAutoExecuted = useRef(false);
  const isLoading = useRef(false);
  const hasLoaded = useRef(false);

  const executeStateCell = useCallback(async (cellId) => {
    const cell = state.cells.find(c => c.id === cellId);
    
    if (cell && cell.type === 'state' && cell.states && state.csvData.length > 0) {
      const startTime = Date.now();
      
      try {
        // Check if computedStatesService is available - initialize if needed
        if (!computedStatesService) {
          console.log('Initializing computedStatesService');
          initializeComputedStatesService(sqliteEngine);
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
            
            // Update the SQL engine with the new data including computed states
            await sqliteEngine.setData(currentData);
            
            // Update the CSV data in state
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

  const executeCell = useCallback(async (cellId) => {
    const cell = state.cells.find(c => c.id === cellId);
    
    if (cell && (cell.type === 'data' || cell.type === 'chart') && cell.query && state.csvData.length > 0) {
      console.log(`Executing ${cell.type} cell ${cellId}: ${cell.title}`);
      console.log('Query:', cell.query);
      
      const startTime = Date.now();
      const result = sqliteEngine.execute(cell.query);
      const executionTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      
      console.log(`Query result:`, result.success, 'rows:', result.data?.length);
      
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
            visibleColumns: resultColumns
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
  }, [state.cells, state.csvData, dispatch, ActionTypes, executeStateCell]);

  useEffect(() => {
    // Only load CSV data if it's not already loaded
    if (state.csvData.length === 0 && !isLoading.current && !hasLoaded.current) {
      console.log('Initiating CSV data load...');
      loadCSVData();
    }
  }, []); // Empty dependency array - only run on mount

  // Auto-execute state cells first, then data cells when CSV data is loaded (only once)
  useEffect(() => {
    console.log('useEffect triggered - csvData.length:', state.csvData.length, 'hasAutoExecuted:', hasAutoExecuted.current);
    
    const executeCellsSequentially = async () => {
      console.log('executeCellsSequentially called');
      if (state.csvData.length > 0 && !hasAutoExecuted.current) {
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
        
        if (stateCellsToExecute.length === 0) {
          console.log('No state cells found! Available cells:', state.cells.map(c => ({id: c.id, type: c.type, title: c.title, hasStates: !!c.states})));
        }
        
        // Execute state cells first - wait for each to complete
        if (stateCellsToExecute.length > 0) {
          console.log('Will execute state cells:', stateCellsToExecute.map(c => `${c.id}: ${c.title}`));
          for (const cell of stateCellsToExecute) {
            console.log(`Executing state cell ${cell.id}: ${cell.title}`);
            await executeStateCell(cell.id);
            // Small delay between state cells
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          console.log('All state cells completed, now executing data cells');
        }
        
        // Then execute data cells and chart cells after state cells are done
        const allQueryCells = [...dataCellsToExecute, ...chartCellsToExecute];
        if (allQueryCells.length > 0) {
          for (const cell of allQueryCells) {
            executeCell(cell.id);
            // Small delay between cells
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
    };

    executeCellsSequentially();
  }, [state.csvData.length]);

  const loadCSVData = useCallback(async () => {
    if (isLoading.current || hasLoaded.current) {
      console.log('CSV loading already in progress or completed, skipping...');
      return;
    }
    
    isLoading.current = true;
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    
    // Add minimum loading time to prevent flickering
    const startTime = Date.now();
    const minLoadTime = 1000; // 1 second minimum
    
    try {
      const result = await csvLoader.loadCSV('./data.csv', 1000);
      
      if (result.success) {
        // Update SQLite engine with new data
        await sqliteEngine.setColumnTypes(result.columnTypes);
        await sqliteEngine.setData(result.data);
        
        // Initialize computed states service
        initializeComputedStatesService(sqliteEngine);
        
        // Ensure minimum loading time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // Update state
        dispatch({ type: ActionTypes.SET_CSV_DATA, payload: result.data });
        
        // Set column types if available
        if (result.columnTypes) {
          dispatch({ type: ActionTypes.SET_COLUMN_TYPES, payload: result.columnTypes });
        }
        
        hasLoaded.current = true;
        
        console.log('CSV data loaded successfully:', result.data.length, 'rows');
      } else {
        console.error('Failed to load CSV:', result.error);
      }
    } catch (error) {
      console.error('Error loading CSV data:', error);
    } finally {
      isLoading.current = false;
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [dispatch, ActionTypes]);


  return {
    loading: state.loading,
    csvData: state.csvData,
    executeCell,
    reloadData: loadCSVData
  };
}