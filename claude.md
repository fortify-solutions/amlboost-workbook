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
Database: PostgreSQL with Redis caching (backend)
API Layer: Express.js REST API with query optimization
Styling: Tailwind CSS 4 with custom "Fortify" design system
State Management: React Context + useReducer
Charts: ECharts for interactive visualizations
Icons: Lucide React + Iconoir
```

### Key Dependencies

#### Frontend
- `react` + `react-dom`: Core React framework
- `echarts`: Professional charting library
- `tailwindcss`: Utility-first CSS framework
- `lucide-react` + `iconoir-react`: Icon libraries

#### Backend
- `express`: Node.js web application framework
- `pg`: PostgreSQL client for Node.js
- `redis`: In-memory data structure store for caching
- `csv-parser`: CSV file processing
- `multer`: File upload middleware
- `helmet`: Security middleware
- `compression`: Response compression

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
- **Server-side PostgreSQL**: Scalable data processing on dedicated backend server
- **CSV Upload & Processing**: Multi-gigabyte CSV files uploaded and processed server-side
- **Query Caching**: Redis-powered intelligent query result caching with 1-hour TTL
- **Computed States**: Feature engineering through SQL expressions executed on server
- **Persistent Storage**: LocalStorage for investigations, PostgreSQL for transaction data
- **Performance Optimization**: Pagination, indexing, and query optimization for large datasets

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
├── apiClient.js          # Backend API communication layer
├── investigationService.js # Save/load investigation persistence
├── chartService.js       # Chart data processing utilities
└── openaiService.js      # AI service integration (placeholder)

backend/
├── server.js            # Express server and middleware setup
├── config/database.js   # PostgreSQL connection pool configuration
├── routes/
│   ├── data.js         # Data retrieval and export endpoints
│   ├── query.js        # SQL query execution with caching
│   └── upload.js       # CSV upload and processing
└── scripts/
    └── migrate.js      # Database schema migrations
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
- **Purpose**: SQL query execution against server-side transaction data
- **Features**: Query editor, paginated results table, column filtering, export
- **SQL Context**: Query against `transactions` table in PostgreSQL
- **Performance**: Scalable to multi-million row datasets with intelligent caching
- **Security**: Server-side query validation (SELECT-only queries allowed)
- **Caching**: Automatic result caching for frequently executed queries

### 3. Chart Cells
- **Purpose**: Interactive data visualization using ECharts
- **Types**: Scatter, bar, line, bubble charts
- **Data Source**: Server-side queries with result pagination for large datasets
- **Customization**: Axis mapping, color coding, size dimensions
- **Performance**: Optimized rendering for datasets with millions of data points

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
- **AI Integration**: 
  - AI button in cell header for one-click access to AI-powered state generation
  - Opens Add State Modal with AI Assistant pre-activated
  - Natural language descriptions automatically converted to SQL expressions
  - Individual computed states also have AI buttons for analysis assistance

## Data Model & Expectations

### Backend Architecture
The application now uses a scalable backend architecture:

**Database**: PostgreSQL with connection pooling (max 20 connections)
**Caching**: Redis for query result caching (1-hour TTL)
**File Processing**: Server-side CSV processing with progress tracking
**Query Execution**: Paginated queries with automatic performance optimization

### Transaction Data Schema
The application processes uploaded CSV files with this structure:

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
2. **Use API Client**: Leverage apiClient.js for all data operations (replaces sqliteEngine.js)
3. **Backend Integration**: Consider server-side processing for data-intensive operations
4. **Maintain State Flow**: Use NotebookContext for global state, local state for UI
5. **Style Consistency**: Use Tailwind classes following existing patterns
6. **AML Focus**: Consider compliance and investigation workflow needs
7. **Performance First**: Design with large dataset scalability in mind

### Common Development Tasks

#### Adding New Cell Type
1. Create component in `src/components/cells/NewCellType.jsx`
2. Add to cell renderer switch in `NotebookContainer.jsx`
3. Add creation option in `AddCellMenu.jsx`
4. Update context reducer for cell-specific actions
5. **Consider adding AI button for consistency with other cell types**

#### Extending SQL Functionality
1. Add custom endpoints to backend routes (`backend/routes/query.js`)
2. Implement PostgreSQL stored procedures or custom functions
3. Update `apiClient.js` to expose new backend functionality
4. Consider query caching implications for new functionality

#### Adding New Chart Types
1. Extend `chartService.js` with new chart configuration
2. Update `ChartCell.jsx` with new chart type options
3. Ensure ECharts compatibility and performance

### Performance Considerations

**Backend Scalability**:
- **PostgreSQL Scaling**: Server-side processing scales to multi-million row datasets
- **CSV Upload**: Multi-gigabyte file uploads with server-side processing and progress tracking
- **Query Caching**: Redis-powered result caching reduces query execution time by 90%+
- **Connection Pooling**: Efficient database connection management (max 20 concurrent connections)
- **Pagination**: All query results paginated (default 1000 rows per page) for optimal performance

**Frontend Optimization**:
- **Chart Rendering**: Optimized for large datasets with server-side data sampling
- **Memory Usage**: Reduced client-side memory footprint with backend data processing
- **State Persistence**: LocalStorage still used for investigations (5-10MB limit)
- **API Communication**: Efficient REST API with compression and caching headers

**File Processing**:
- **Upload Limits**: Configurable file size limits (default 500MB, expandable to multi-GB)
- **Background Processing**: Asynchronous CSV processing with status tracking
- **Data Quality**: Automatic data quality reports and validation on upload

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
- Check backend logs for CSV processing errors
- Verify backend server is running (`npm run dev` in `/backend` directory)
- Monitor upload progress via status endpoints
- Check PostgreSQL connection and table creation
- Review file size limits and server disk space

### SQL Query Problems  
- Test queries using PostgreSQL client or backend API
- Check server-side query validation (only SELECT statements allowed)
- Monitor query execution time and caching effectiveness
- Review PostgreSQL logs for performance bottlenecks
- Verify pagination is working correctly for large result sets

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
- **AI buttons available across all cell types for consistent user experience**

### Integration Points
- `src/services/openaiService.js` - Main integration point
- AI cells can access investigation data for context
- Consider privacy/security for sensitive financial data
- Rate limiting and error handling for API calls

### AI Button Locations
- **DataCell**: AI button in cell actions (purple, with Sparkles icon)
- **ChartCell**: AI button in cell actions for chart configuration assistance
- **StateCell**: 
  - AI button in cell header for direct access to state generation
  - Individual AI buttons on each computed state for analysis
  - One-click access opens Add State Modal with AI Assistant pre-activated
- **AICell**: Native AI chat interface

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

### Frontend Development
```bash
# Start frontend development server
npm run dev

# Build frontend for production  
npm run build

# Run code quality checks
npm run lint

# Preview production build locally
npm run preview
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start backend development server (with auto-reload)
npm run dev

# Start backend production server
npm start

# Run database migrations
npm run migrate

# Seed database with sample data
npm run seed
```

## Key Files for Rapid Onboarding

### Frontend
1. **`src/App.jsx`** - Application entry point and error boundaries
2. **`src/stores/NotebookContext.jsx`** - Global state management
3. **`src/components/NotebookContainer.jsx`** - Main notebook interface
4. **`src/services/apiClient.js`** - Backend API communication layer
5. **`src/data/sampleInvestigations.js`** - Sample AML investigations

### Backend
1. **`backend/server.js`** - Express server setup and middleware
2. **`backend/config/database.js`** - PostgreSQL configuration
3. **`backend/routes/query.js`** - SQL query execution and caching
4. **`backend/routes/upload.js`** - CSV file upload and processing
5. **`backend/routes/data.js`** - Data retrieval and export endpoints

## Common Issues & Troubleshooting

### Application Connection Issues

**Symptoms**: App shows "Backend not available" or API connection errors

**Common Causes**:
1. **Backend Server Not Running**: Express server not started
2. **Database Connection Issues**: PostgreSQL not accessible
3. **Port Conflicts**: Backend running on different port than expected
4. **CORS Configuration**: Frontend/backend URL mismatch

**Solutions**:
- Ensure backend server is running: `cd backend && npm run dev`
- Verify PostgreSQL is running and accessible
- Check backend logs for connection errors
- Confirm frontend is connecting to correct backend URL (default: localhost:3001)
- Review CORS configuration in `backend/server.js`

**Code Locations to Check**:
- `backend/server.js:16` - Server port configuration
- `backend/config/database.js:7` - PostgreSQL connection settings
- `src/services/apiClient.js:3` - Backend URL configuration
- `backend/server.js:23` - CORS origin configuration

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

**Symptoms**: Slow CSV upload or query execution

**Backend Optimizations**:
- Server-side CSV processing handles multi-gigabyte files efficiently
- PostgreSQL indexing on commonly queried columns for fast lookups
- Query result caching with Redis (1-hour TTL) for instant repeat queries
- Connection pooling (max 20 connections) for concurrent query handling
- Pagination (default 1000 rows per page) prevents memory overload

**Monitoring & Tuning**:
- Check backend logs for query execution times
- Monitor Redis cache hit rates for query optimization
- Review PostgreSQL query plans for performance bottlenecks
- Use `/api/query/performance` endpoint for query analytics

### Development Setup Issues

**Frontend Prerequisites**:
```bash
npm install  # Install frontend dependencies
npm run dev  # Start frontend development server
```

**Backend Prerequisites**:
```bash
cd backend
npm install  # Install backend dependencies
npm run migrate  # Set up database schema
npm run dev  # Start backend development server
```

**Database Setup Requirements**:
```
PostgreSQL 12+ with:
├── Database: amlboost
├── User: amlboost_user (with full privileges)
├── Tables: transactions, query_cache
└── Indexes: Optimized for common query patterns

Redis (optional, for query caching):
├── Default configuration
└── Used for query result caching
```

**Environment Variables** (backend/.env):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=amlboost
DB_USER=amlboost_user
DB_PASSWORD=your_password
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
PORT=3001
```

This file should be updated when significant architectural changes are made to ensure future development assistance remains accurate and efficient.