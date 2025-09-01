# Claude.md - AMLBoost Development Guide

This file provides essential context for LLMs working on the AMLBoost project to ensure efficient and accurate development assistance.

## Project Overview

**AMLBoost** is a sophisticated React-based notebook application designed for Anti-Money Laundering (AML) investigations and financial transaction analysis. It provides a Jupyter-style interface with specialized cells for data analysis, visualization, and AI-powered insights.

### Key Characteristics
- **Domain**: Financial crime detection, AML compliance, fraud investigation
- **Architecture**: Client-side React application with SQLite-in-browser data processing
- **User Base**: Compliance professionals, AML investigators, risk analysts
- **Data Focus**: Financial transaction datasets with emphasis on pattern detection

## Technical Stack

### Core Technologies
```
Frontend Framework: React 19 (functional components + hooks)
Build Tool: Vite 7
Database: SQL.js (SQLite in browser)
Styling: Tailwind CSS 4 with custom "Fortify" design system
State Management: React Context + useReducer
Charts: ECharts for interactive visualizations
Icons: Lucide React + Iconoir
```

### Key Dependencies
- `sql.js`: Client-side SQLite database engine
- `echarts`: Professional charting library
- `react` + `react-dom`: Core React framework
- `tailwindcss`: Utility-first CSS framework
- `lucide-react` + `iconoir-react`: Icon libraries

## Architecture Patterns

### State Management
- **Global State**: NotebookContext.jsx using useReducer pattern
- **Local State**: Component-level useState for UI interactions
- **Data Flow**: Unidirectional with action dispatchers

### Component Structure
- **Functional Components**: All components use hooks (no class components)
- **Cell-based Architecture**: Modular cells for different analysis types
- **Modal Pattern**: Centralized modal management through context

### Data Processing
- **Client-side SQLite**: All data processing happens in browser using SQL.js
- **CSV Loading**: Files loaded from `public/data.csv` and processed into SQLite
- **Computed States**: Feature engineering through SQL expressions
- **Persistent Storage**: LocalStorage for investigations and computed states

## File Structure Quick Reference

### Core Components
```
src/components/
├── LandingScreen.jsx       # Main landing page with investigation selector  
├── NotebookContainer.jsx   # Main notebook interface and cell renderer
├── cells/                  # Specialized notebook cell types
│   ├── AICell.jsx         # AI-powered analysis cell
│   ├── ChartCell.jsx      # Data visualization cell
│   ├── DataCell.jsx       # SQL query execution cell
│   ├── AddCellMenu.jsx    # Cell creation interface
│   └── CellHeader.jsx     # Universal cell header component
├── modals/                # Dialog components
│   ├── SaveInvestigationModal.jsx
│   ├── AIAssistModal.jsx
│   └── SettingsModal.jsx
└── ui/
    └── Icon.jsx           # Icon wrapper component
```

### Services & Logic
```
src/services/
├── sqliteEngine.js        # Client-side database operations
├── csvLoader.js          # CSV file processing and loading
├── investigationService.js # Save/load investigation persistence
├── chartService.js       # Chart data processing utilities
└── openaiService.js      # AI service integration (placeholder)
```

### Data & State
```
src/stores/
└── NotebookContext.jsx    # Global application state management

src/data/
└── sampleInvestigations.js # Pre-built AML investigation templates
```

## Cell Types Deep Dive

### 1. Markdown Cells
- **Purpose**: Documentation, investigation notes, findings summary
- **Features**: Rich markdown rendering with custom parser
- **State**: Editable content with save/cancel actions

### 2. Data Cells  
- **Purpose**: SQL query execution against loaded transaction data
- **Features**: Query editor, results table, column filtering, export
- **SQL Context**: Query against `transactions` table in SQLite
- **Performance**: Optimized for datasets up to ~100K rows

### 3. Chart Cells
- **Purpose**: Interactive data visualization using ECharts
- **Types**: Scatter, bar, line, bubble charts
- **Data Source**: Can query database or use results from data cells
- **Customization**: Axis mapping, color coding, size dimensions

### 4. AI Cells
- **Purpose**: AI-powered analysis and pattern recognition  
- **Interface**: Chat-like interface with conversation history
- **Integration**: Designed for OpenAI API integration (currently placeholder)
- **Context**: Has access to investigation data for informed analysis

### 5. State Cells (Advanced Feature)
- **Purpose**: Computed risk metrics and feature engineering
- **Functionality**: Define SQL expressions that create new calculated columns
- **Persistence**: Can persist computed states back to the dataset
- **Use Cases**: Risk scores, user velocity metrics, geographic diversity

## Data Model & Expectations

### Transaction Data Schema
The application expects CSV data with this structure:

**Core Fields:**
```
user_id         # User/customer identifier
merchant_id     # Merchant/business identifier  
charged_amount  # Transaction amount (numeric)
txn_date_time   # Transaction timestamp (ISO format)
outcome         # Transaction result ("TN" = success)
```

**AML Enhancement Fields:**
```
fraud           # Binary fraud flag (0/1)
decline         # Binary decline flag (0/1)
merchant_country # Merchant jurisdiction/country
merchant_name   # Human-readable merchant name
mcc             # Merchant Category Code
payment_method  # Payment instrument type
```

### Sample Data Context
The app includes comprehensive sample investigations demonstrating:
- Advanced fraud detection with ML features
- Cross-border financial network analysis
- Merchant ecosystem and network analysis

## Development Guidelines

### When Adding Features

1. **Follow Cell Pattern**: New analysis types should be implemented as cell components
2. **Use Existing Services**: Leverage sqliteEngine.js for data operations
3. **Maintain State Flow**: Use NotebookContext for global state, local state for UI
4. **Style Consistency**: Use Tailwind classes following existing patterns
5. **AML Focus**: Consider compliance and investigation workflow needs

### Common Development Tasks

#### Adding New Cell Type
1. Create component in `src/components/cells/NewCellType.jsx`
2. Add to cell renderer switch in `NotebookContainer.jsx`
3. Add creation option in `AddCellMenu.jsx`
4. Update context reducer for cell-specific actions

#### Extending SQL Functionality
1. Modify `sqliteEngine.js` to add custom SQL functions
2. Update data loading in `csvLoader.js` if needed
3. Consider computed state integration for persistent calculations

#### Adding New Chart Types
1. Extend `chartService.js` with new chart configuration
2. Update `ChartCell.jsx` with new chart type options
3. Ensure ECharts compatibility and performance

### Performance Considerations

- **SQLite Scaling**: Client-side processing works well up to ~100K rows
- **Chart Rendering**: Optimize for datasets under 10K points for smooth interaction  
- **Memory Usage**: Large investigations with many cells may impact browser performance
- **State Persistence**: LocalStorage has size limits (typically 5-10MB)

### Error Handling Patterns

- **SQL Errors**: Catch and display user-friendly error messages
- **Data Loading**: Provide progress indicators and error recovery
- **Chart Errors**: Graceful fallback for invalid data configurations
- **Investigation Loading**: Handle corrupted or missing investigation data

## Testing & Quality

### Manual Testing Approach
- Use sample investigations to validate new features
- Test with various data sizes and formats
- Verify cross-browser compatibility (Chrome, Firefox, Safari)
- Check mobile responsiveness for tablet use

### Code Quality
- Run `npm run lint` before committing changes
- Follow React functional component patterns
- Use TypeScript-style JSDoc comments for complex functions
- Maintain Tailwind CSS utility class organization

## Common Debugging Scenarios

### Data Loading Issues
- Check browser console for CSV parsing errors
- Verify `data.csv` exists in `public/` directory  
- Ensure CSV headers match expected format
- Monitor SQLite memory usage in DevTools

### SQL Query Problems  
- Test queries in browser SQLite console
- Check for reserved keyword conflicts
- Verify data types in computed expressions
- Monitor query execution time for performance

### Chart Rendering Issues
- Validate data format matches chart requirements
- Check ECharts documentation for configuration options
- Ensure numeric fields are properly typed
- Test with reduced data sets for performance

### State Management Problems
- Use React DevTools to inspect context state
- Check reducer actions for proper state updates  
- Verify component re-rendering with state changes
- Monitor for memory leaks with useEffect cleanup

## AI Integration Notes

### Current Status
- AI cells provide interface for conversation-style analysis
- OpenAI service is placeholder - requires API key configuration
- Messages stored in cell state for persistence

### Integration Points
- `src/services/openaiService.js` - Main integration point
- AI cells can access investigation data for context
- Consider privacy/security for sensitive financial data
- Rate limiting and error handling for API calls

## Contributing Guidelines

### Before Making Changes
1. Review existing similar implementations
2. Consider impact on investigation workflows
3. Test with sample data and investigations
4. Ensure AML compliance context is maintained

### Code Style
- Use functional React components with hooks
- Prefer composition over inheritance  
- Keep components focused and single-purpose
- Use descriptive variable names relevant to financial domain
- Comment complex financial calculations and AML logic

### Documentation Updates
- Update this claude.md file for significant architectural changes
- Add JSDoc comments for new service functions
- Update README.md for user-facing feature changes
- Consider adding sample investigation examples for new features

---

## Quick Development Commands

```bash
# Start development with hot reload
npm run dev

# Build for production  
npm run build

# Run code quality checks
npm run lint

# Preview production build locally
npm run preview
```

## Key Files for Rapid Onboarding

1. **`src/App.jsx`** - Application entry point and error boundaries
2. **`src/stores/NotebookContext.jsx`** - Global state management
3. **`src/components/NotebookContainer.jsx`** - Main notebook interface
4. **`src/services/sqliteEngine.js`** - Data processing engine
5. **`src/data/sampleInvestigations.js`** - Sample AML investigations

## Common Issues & Troubleshooting

### Application Hangs or Infinite Loading

**Symptoms**: App gets stuck on "Loading transaction data..." or shows flickering screen

**Common Causes**:
1. **SQLite WASM Loading Issues**: WASM files not found or incorrect paths
2. **Missing Data Files**: `data-types.json` or `data.csv` not accessible
3. **Computed States Auto-execution**: Expensive per-row calculations causing hangs

**Solutions**:
- Ensure WASM files (`sql-wasm.js`, `sql-wasm.wasm`) exist in `public/` directory
- Verify `data-types.json` and `data.csv` are in `public/` directory
- Check file paths use relative paths (`./file`) not absolute (`/file`)
- For computed states causing hangs, set `persistent: false` to disable auto-execution

**Code Locations to Check**:
- `src/services/sqliteEngine.js:18` - WASM file loading configuration
- `src/services/csvLoader.js:7` - data-types.json path
- `src/data/sampleInvestigations.js` - persistent states configuration
- `src/hooks/useCSVLoader.js:141` - auto-execution logic

### Cell Deletion Not Working

**Symptoms**: Three-dot menu not visible or delete option missing

**Common Causes**:
- Icon mapping issues with vertical three-dot menu icon
- CellHeader component not properly rendered

**Solutions**:
- Verify Icon component fallback works for `MoreVertical` (should show ⋮)
- Check CellHeader is included in all cell renderers
- Ensure delete functionality exists in dropdown menu

### Data Loading Performance

**Symptoms**: Slow loading with large datasets

**Optimizations**:
- CSV loading limited to 1000 rows by default (`maxRows` parameter)
- SQLite indexing on commonly queried columns
- Batch processing for computed states (100 rows per batch)
- Client-side processing scales to ~100K rows effectively

### Development Setup Issues

**Prerequisites**:
```bash
npm install  # Install dependencies first
npm run dev  # Start development server
```

**File Structure Requirements**:
```
public/
├── data.csv              # Transaction data (required)
├── data-types.json       # Column type definitions
├── sql-wasm.js          # SQLite JavaScript wrapper
├── sql-wasm.wasm        # SQLite WebAssembly binary
└── favicon.ico          # Site favicon
```

This file should be updated when significant architectural changes are made to ensure future development assistance remains accurate and efficient.