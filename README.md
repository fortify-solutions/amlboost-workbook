# AMLBoost - Intelligent Transaction Analysis Platform

AMLBoost is a sophisticated, interactive notebook application designed for Anti-Money Laundering (AML) investigations and transaction analysis. Built with React and Vite, it provides a comprehensive platform for financial crime detection, compliance analysis, and risk assessment.

## 🚀 Key Features

### 📊 **Advanced Analytics Engine**
- **SQL-based Data Analysis**: Execute complex queries on transaction datasets using SQL.js
- **Computed Risk States**: Define and persist calculated risk metrics across investigations
- **Real-time Processing**: Client-side SQLite engine for fast data manipulation
- **Multi-dimensional Analysis**: Support for geographic, temporal, and behavioral pattern detection

### 🔬 **Investigation Management**
- **Multi-cell Notebooks**: Jupyter-style interface with specialized cell types:
  - **Markdown Cells**: Rich documentation and investigation notes
  - **Data Cells**: SQL query execution with advanced filtering
  - **Chart Cells**: Interactive visualizations using ECharts
  - **AI Cells**: AI-powered analysis and pattern recognition
  - **State Cells**: Computed risk metrics and feature engineering
- **Save/Load Investigations**: Persistent storage of complete analysis workflows
- **Sample Investigations**: Pre-built AML investigation templates

### 🌍 **AML-Specific Features**
- **Cross-border Analysis**: Geographic transaction flow monitoring
- **Merchant Risk Assessment**: Network analysis and performance profiling
- **Fraud Detection**: Advanced pattern recognition for suspicious activities
- **Regulatory Compliance**: Built-in frameworks for BSA/AML, OFAC, FinCEN requirements

### 🎨 **Professional UI/UX**
- **Modern Design**: Tailwind CSS with custom "Fortify" theme
- **Responsive Layout**: Optimized for compliance professionals
- **Interactive Dashboards**: Real-time data visualization and filtering
- **Error Handling**: Robust error boundaries and user feedback

## 🏗️ Technical Architecture

### System Overview
AMLBoost now features a scalable backend architecture designed to handle large-scale financial datasets:

- **Frontend**: React-based notebook interface for analysis and visualization
- **Backend**: Express.js REST API with PostgreSQL database and Redis caching
- **Processing**: Server-side CSV processing and SQL query execution
- **Caching**: Intelligent query result caching with automatic expiration
- **Security**: Query validation, file upload limits, and CORS protection

### Core Technologies
- **Frontend**: React 19 with functional components and hooks
- **Build System**: Vite 7 with hot reload and optimized bundling  
- **Database**: PostgreSQL with Redis caching for scalable data processing
- **Backend**: Express.js REST API with query optimization and file upload
- **Visualization**: ECharts for interactive charts and graphs
- **Styling**: Tailwind CSS 4 with custom design system
- **State Management**: React Context with reducer pattern
- **Icons**: Lucide React and Iconoir for comprehensive icon library

### Project Structure
```
src/
├── components/
│   ├── cells/           # Specialized notebook cell components
│   │   ├── AICell.jsx          # AI-powered analysis cell
│   │   ├── ChartCell.jsx       # Data visualization cell  
│   │   ├── DataCell.jsx        # SQL query execution cell
│   │   └── AddCellMenu.jsx     # Cell creation interface
│   ├── modals/          # Dialog components
│   │   ├── AIAssistModal.jsx   # AI analysis interface
│   │   ├── SaveInvestigationModal.jsx
│   │   └── SettingsModal.jsx
│   └── ui/              # Reusable UI components
├── services/            # Business logic and data processing
│   ├── sqliteEngine.js         # Client-side database engine
│   ├── chartService.js         # Visualization data processing
│   ├── investigationService.js  # Investigation persistence
│   └── openaiService.js        # AI integration (placeholder)
├── stores/              # Application state management
│   └── NotebookContext.jsx     # Global notebook state
├── data/                # Sample datasets and configurations
│   └── sampleInvestigations.js # Pre-built AML investigations
└── utils/               # Utility functions
    ├── chartDataProcessor.js
    └── markdownParser.jsx
```

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js**: Version 18.0 or higher
- **PostgreSQL**: Version 12.0 or higher
- **Redis**: (Optional, for query caching)
- **npm**: Comes with Node.js installation

### Database Setup
```bash
# Create PostgreSQL database and user
psql -U postgres
CREATE DATABASE amlboost;
CREATE USER amlboost_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE amlboost TO amlboost_user;
\q
```

### Backend Setup
```bash
# Clone the repository
git clone <repository-url>
cd workbook-flow/backend

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Start backend development server
npm run dev
```

### Frontend Setup
```bash
# In a new terminal, from project root
npm install

# Start frontend development server
npm run dev
```

The application will be available at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001/api`

### Available Scripts

#### Frontend Scripts
```bash
npm run dev      # Start frontend development server with hot reload
npm run build    # Build frontend for production
npm run preview  # Preview frontend production build
npm run lint     # Run ESLint code quality checks
```

#### Backend Scripts (from /backend directory)
```bash
npm run dev      # Start backend development server with auto-reload
npm start        # Start backend production server
npm run migrate  # Run database schema migrations
npm run seed     # Seed database with sample data (if available)
```

## 📊 Data Requirements

### CSV Upload Process
With the new backend architecture, transaction data is uploaded directly through the application interface:

1. **File Upload**: Use the application's CSV upload feature to process large datasets
2. **Server Processing**: Files are processed server-side with progress tracking
3. **Data Validation**: Automatic data quality checks and type inference
4. **Scalability**: Support for multi-gigabyte CSV files

### Expected CSV Format
The backend processes uploaded CSV files with the following structure:

**Required Columns:**
- `user_id`: Unique identifier for transaction initiator
- `merchant_id`: Unique identifier for receiving merchant
- `charged_amount`: Transaction amount (numeric)
- `txn_date_time`: Transaction timestamp (ISO format)
- `outcome`: Transaction result (e.g., "TN" = success)

**Optional Columns (enhance analysis):**
- `fraud`: Binary fraud indicator (0/1)
- `decline`: Binary decline indicator (0/1) 
- `merchant_country`: Merchant jurisdiction
- `merchant_name`: Merchant display name
- `mcc`: Merchant Category Code
- `payment_method`: Payment instrument type

### Sample Data Structure
```csv
user_id,merchant_id,charged_amount,txn_date_time,outcome,fraud,decline,merchant_country,merchant_name,mcc
user_001,merch_123,150.00,2024-01-15T10:30:00Z,TN,0,0,USA,TechCorp Solutions,7372
user_002,merch_456,2500.75,2024-01-15T11:45:00Z,TN,0,0,BRA,Global Retail Inc,5311
```

## 🔍 Investigation Workflows

### 1. **Creating New Investigations**
- Start from the landing screen
- Add cells sequentially to build analysis workflow
- Use computed states for feature engineering
- Document findings with markdown cells

### 2. **Pre-built Investigation Templates**
AMLBoost includes sophisticated sample investigations:

- **Advanced Fraud Detection**: ML-enhanced pattern recognition
- **Cross-Border Network Analysis**: Geographic flow monitoring  
- **Merchant Ecosystem Analysis**: Network relationship mapping

### 3. **Cell Types Deep Dive**

#### Data Cells
Execute SQL queries against loaded transaction data:
```sql
SELECT user_id, COUNT(*) as txn_count, 
       SUM(charged_amount) as total_volume,
       SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_count
FROM transactions 
GROUP BY user_id
HAVING txn_count > 10
ORDER BY total_volume DESC
```

#### State Cells  
Define computed risk metrics:
```sql
-- User transaction velocity (computed state)
COUNT(*) OVER (PARTITION BY user_id)

-- Geographic diversity score
COUNT(DISTINCT merchant_country) OVER (PARTITION BY user_id)
```

#### Chart Cells
Create interactive visualizations:
- Scatter plots for risk matrices
- Bar charts for categorical analysis  
- Line charts for temporal patterns
- Bubble charts for multi-dimensional data

## 🔧 Advanced Configuration

### Environment Variables

#### Frontend (.env)
```env
# Backend API URL (optional, defaults to localhost:3001)
VITE_API_URL=http://localhost:3001/api
VITE_OPENAI_API_KEY=your-openai-key
```

#### Backend (backend/.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=amlboost
DB_USER=amlboost_user
DB_PASSWORD=your_database_password

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# File Upload Limits
MAX_FILE_SIZE=500MB
```

### Customization Options

#### Styling & Themes
- Modify `tailwind.config.js` for design system changes
- Custom CSS in `src/index.css` for Fortify theme adjustments
- Component-level styling with Tailwind utility classes

#### Data Processing
- Extend backend routes (`backend/routes/*.js`) for custom functionality
- Add PostgreSQL stored procedures for complex calculations
- Modify `chartDataProcessor.js` for visualization enhancements
- Update `investigationService.js` for storage customizations
- Leverage Redis caching for performance optimizations

#### Cell Extensions
Add new cell types by:
1. Creating component in `src/components/cells/`
2. Registering in `NotebookContainer.jsx` 
3. Adding to cell creation menu

## 🏭 Production Deployment

### Build Process

#### Frontend Build
```bash
# Create optimized frontend build
npm run build

# Files generated in dist/ directory
# Ready for deployment to static hosting service
```

#### Backend Deployment
```bash
# From backend directory
npm start  # Production server

# Or use process manager like PM2
pm2 start server.js --name amlboost-backend
```

### Deployment Options

#### Frontend Deployment
- **Static Hosting**: Netlify, Vercel, GitHub Pages (for frontend build)
- **CDN Distribution**: CloudFront, CloudFlare
- **Container Deployment**: Docker with nginx

#### Backend Deployment
- **Cloud Platforms**: AWS EC2, Google Cloud, Azure, DigitalOcean
- **Container Orchestration**: Docker, Kubernetes
- **Database Hosting**: AWS RDS, Google Cloud SQL, Azure Database
- **Caching**: Redis Cloud, AWS ElastiCache
- **Process Management**: PM2, Supervisor, systemd

### Performance Considerations
- **Backend PostgreSQL**: Scales to multi-million row datasets efficiently
- **Query Caching**: Redis-powered result caching reduces query times by 90%+
- **File Processing**: Server-side CSV processing handles multi-gigabyte files
- **Pagination**: All queries paginated (default 1000 rows) for optimal performance
- **Chart Rendering**: Optimized for large datasets with server-side sampling

## 🤝 Development & Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-analysis-type`
3. Implement changes following existing patterns
4. Run linting: `npm run lint`  
5. Test with sample investigations
6. Submit pull request with detailed description

### Code Standards
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **State**: Context + useReducer pattern
- **Testing**: Manual testing with sample data
- **Documentation**: JSDoc for complex functions

## 📚 Use Cases

### Financial Institutions
- Transaction monitoring and surveillance
- Regulatory compliance reporting
- Customer due diligence investigations
- Sanctions screening analysis

### FinTech Companies  
- Fraud detection model validation
- Risk assessment automation
- Payment network analysis
- Merchant onboarding due diligence

### Regulatory Bodies
- Examination preparation and analysis
- Pattern recognition training
- Case study development
- Compliance assessment tools

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Problems**
   - **Symptoms**: App shows "Backend not available" or API connection errors
   - **Solutions**: 
     - Ensure backend server is running: `cd backend && npm run dev`
     - Verify PostgreSQL is running and accessible
     - Check backend logs for connection errors
     - Confirm frontend connects to correct backend URL (default: localhost:3001)
     - Review CORS configuration in `backend/server.js`

2. **Database Connection Issues**
   - **Symptoms**: Backend fails to start with database errors
   - **Solutions**:
     - Verify PostgreSQL is installed and running
     - Check database credentials in `backend/.env`
     - Ensure database and user exist with proper permissions
     - Run database migrations: `cd backend && npm run migrate`

3. **CSV Upload Problems**
   - **Symptoms**: File upload fails or stalls
   - **Solutions**:
     - Check file size limits (default 500MB)
     - Verify CSV format matches expected structure
     - Monitor backend logs for processing errors
     - Ensure sufficient disk space on server

4. **Query Performance Issues**
   - **Symptoms**: Slow query execution times
   - **Solutions**:
     - Monitor query cache hit rates
     - Check PostgreSQL query plans for bottlenecks
     - Consider adding database indexes for frequently queried columns
     - Use pagination for large result sets

5. **Chart Rendering Problems** 
   - Verify data types match chart requirements
   - Check ECharts documentation for configuration options
   - Ensure numeric fields are properly typed
   - Test with smaller datasets to isolate performance issues

### Getting Support
- Check browser developer console for frontend error messages
- Review backend logs for server-side issues
- Verify Node.js version: `node --version`
- Ensure all dependencies installed:
  - Frontend: `npm install`
  - Backend: `cd backend && npm install`
- Test database connectivity: Backend should show "Database connected successfully"
- Review sample investigations for usage patterns

## 📄 License

This project is proprietary and confidential. All rights reserved.