import React from 'react';
import { NotebookProvider, useNotebook } from './stores/NotebookContext';
import { NotebookContainer } from './components/NotebookContainer';
import { LandingScreen } from './components/LandingScreen';
import { InvestigationService } from './services/investigationService';
import { useCSVLoader } from './hooks/useCSVLoader';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Error: {this.state.error?.message}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function NotebookApp() {
  const { state, dispatch, ActionTypes } = useNotebook();
  const { loading, csvData } = useCSVLoader();

  console.log('NotebookApp render - loading:', loading, 'csvData rows:', csvData.length);

  const handleCreateNew = () => {
    dispatch({ type: ActionTypes.RESET_NOTEBOOK });
    dispatch({ type: ActionTypes.SHOW_LANDING_SCREEN, payload: false });
  };

  const handleLoadInvestigation = async (investigationId) => {
    try {
      const investigation = InvestigationService.loadInvestigation(investigationId);
      dispatch({
        type: ActionTypes.LOAD_INVESTIGATION,
        payload: {
          investigation,
          cells: investigation.cells
        }
      });
    } catch (error) {
      alert('Failed to load investigation: ' + error.message);
    }
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

  if (state.showLandingScreen) {
    return (
      <LandingScreen 
        onCreateNew={handleCreateNew}
        onLoadInvestigation={handleLoadInvestigation}
      />
    );
  }

  return <NotebookContainer />;
}

function App() {
  return (
    <ErrorBoundary>
      <NotebookProvider>
        <NotebookApp />
      </NotebookProvider>
    </ErrorBoundary>
  );
}

export default App;
