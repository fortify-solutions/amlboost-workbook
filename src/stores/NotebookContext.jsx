import { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  csvData: [],
  cells: [
    {
      id: 1,
      type: 'markdown',
      content: '# Transaction Analysis Notebook\n\nThis notebook contains our analysis of financial transaction data, including fraud detection, geographic patterns, and payment method analysis.',
      collapsed: false,
      executed: true,
      executionTime: null
    },
    {
      id: 2,
      type: 'data',
      title: 'Load Transaction Data',
      query: 'SELECT * FROM transactions ORDER BY txn_date_time DESC LIMIT 10',
      columns: [],
      visibleColumns: [],
      filters: [],
      collapsed: false,
      executed: false,
      executionTime: null,
      rowCount: null,
      queryResults: []
    },
    {
      id: 3,
      type: 'state',
      title: 'Define Computed States',
      states: [
        { 
          name: 'user_fraud_risk', 
          description: 'Fraud risk score based on decline patterns', 
          query: 'SELECT COUNT(*) FROM transactions WHERE user_id = t.user_id AND decline = 1',
          persistent: false
        },
        { 
          name: 'merchant_success_rate', 
          description: 'Success rate for merchant transactions', 
          query: 'SELECT AVG(CASE WHEN outcome = "TN" THEN 1 ELSE 0 END) FROM transactions WHERE merchant_id = t.merchant_id',
          persistent: false
        }
      ],
      collapsed: false,
      executed: true,
      executionTime: '0.8s'
    },
    {
      id: 4,
      type: 'chart',
      title: 'Transaction Volume Over Time',
      chartType: 'line',
      xAxis: 'txn_date_time',
      yAxis: 'charged_amount',
      groupBy: 'none',
      query: 'SELECT DATE(txn_date_time) as date, SUM(charged_amount) as total_amount FROM transactions GROUP BY DATE(txn_date_time) ORDER BY date LIMIT 30',
      collapsed: false,
      executed: true,
      executionTime: '2.1s'
    },
    {
      id: 5,
      type: 'ai',
      title: 'AI Assistant',
      messages: [],
      collapsed: false,
      executed: false,
      executionTime: null
    }
  ],
  loading: false,
  backendStats: null, // Stats from backend API
  selectedCellId: null,
  editingCellId: null,
  modals: {
    aiAssist: { open: false, cellId: null },
    addState: { open: false, cellId: null },
    editState: { open: false, cellId: null, stateIndex: null },
    settings: false,
    saveInvestigation: false
  },
  settings: {
    apiKey: localStorage.getItem('openai_api_key') || ''
  },
  columnTypes: {},
  currentInvestigation: null,
  showLandingScreen: true
};

// Action types
const ActionTypes = {
  SET_CSV_DATA: 'SET_CSV_DATA',
  SET_BACKEND_STATS: 'SET_BACKEND_STATS',
  SET_LOADING: 'SET_LOADING',
  SET_SELECTED_CELL: 'SET_SELECTED_CELL',
  SET_EDITING_CELL: 'SET_EDITING_CELL',
  ADD_CELL: 'ADD_CELL',
  UPDATE_CELL: 'UPDATE_CELL',
  DELETE_CELL: 'DELETE_CELL',
  EXECUTE_CELL: 'EXECUTE_CELL',
  TOGGLE_MODAL: 'TOGGLE_MODAL',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_COLUMN_TYPES: 'SET_COLUMN_TYPES',
  LOAD_INVESTIGATION: 'LOAD_INVESTIGATION',
  SET_CURRENT_INVESTIGATION: 'SET_CURRENT_INVESTIGATION',
  SHOW_LANDING_SCREEN: 'SHOW_LANDING_SCREEN',
  RESET_NOTEBOOK: 'RESET_NOTEBOOK'
};

// Reducer
function notebookReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_CSV_DATA:
      return { ...state, csvData: action.payload };
    
    case ActionTypes.SET_BACKEND_STATS:
      return { ...state, backendStats: action.payload };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_SELECTED_CELL:
      return { ...state, selectedCellId: action.payload };
    
    case ActionTypes.SET_EDITING_CELL:
      return { ...state, editingCellId: action.payload };
    
    case ActionTypes.ADD_CELL:
      const newCells = action.payload.afterId 
        ? (() => {
            const index = state.cells.findIndex(c => c.id === action.payload.afterId);
            const updated = [...state.cells];
            updated.splice(index + 1, 0, action.payload.cell);
            return updated;
          })()
        : [...state.cells, action.payload.cell];
      return { ...state, cells: newCells };
    
    case ActionTypes.UPDATE_CELL:
      return {
        ...state,
        cells: state.cells.map(cell => 
          cell.id === action.payload.id 
            ? { ...cell, ...action.payload.updates }
            : cell
        )
      };
    
    case ActionTypes.DELETE_CELL:
      return {
        ...state,
        cells: state.cells.filter(cell => cell.id !== action.payload)
      };
    
    case ActionTypes.EXECUTE_CELL:
      return {
        ...state,
        cells: state.cells.map(cell =>
          cell.id === action.payload.cellId
            ? { 
                ...cell, 
                executed: action.payload.success,
                executionTime: action.payload.executionTime,
                queryResults: action.payload.results || cell.queryResults,
                queryError: action.payload.error || null,
                rowCount: action.payload.rowCount || cell.rowCount,
                columns: action.payload.columns || cell.columns,
                visibleColumns: action.payload.visibleColumns || cell.visibleColumns
              }
            : cell
        )
      };
    
    case ActionTypes.TOGGLE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: action.payload.value
        }
      };
    
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    
    case ActionTypes.SET_COLUMN_TYPES:
      return {
        ...state,
        columnTypes: action.payload
      };
    
    case ActionTypes.LOAD_INVESTIGATION:
      return {
        ...state,
        cells: action.payload.cells,
        currentInvestigation: action.payload.investigation,
        showLandingScreen: false
      };
    
    case ActionTypes.SET_CURRENT_INVESTIGATION:
      return {
        ...state,
        currentInvestigation: action.payload
      };
    
    case ActionTypes.SHOW_LANDING_SCREEN:
      return {
        ...state,
        showLandingScreen: action.payload
      };
    
    case ActionTypes.RESET_NOTEBOOK:
      return {
        ...state, // Keep current state
        cells: [], // Empty cells for new investigation
        selectedCellId: null,
        editingCellId: null,
        currentInvestigation: null,
        showLandingScreen: false
      };
    
    default:
      return state;
  }
}

// Context
const NotebookContext = createContext();

// Provider component
export function NotebookProvider({ children }) {
  const [state, dispatch] = useReducer(notebookReducer, initialState);

  return (
    <NotebookContext.Provider value={{ state, dispatch, ActionTypes }}>
      {children}
    </NotebookContext.Provider>
  );
}

// Custom hook
export function useNotebook() {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebook must be used within a NotebookProvider');
  }
  return context;
}