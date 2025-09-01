# RuleTune - Intelligent Transaction Analysis Platform

RuleTune is a sophisticated, interactive notebook application designed for Anti-Money Laundering (AML) investigations and transaction analysis. Built with React and Vite, it provides a comprehensive platform for financial crime detection, compliance analysis, and risk assessment.

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

### Core Technologies
- **Frontend**: React 19 with functional components and hooks
- **Build System**: Vite 7 with hot reload and optimized bundling  
- **Database**: SQL.js (SQLite in browser) for client-side data processing
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
- **npm**: Comes with Node.js installation

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd v0.9_notebook_structured

# Install dependencies
npm install

# Add transaction data (CSV format)
# Place your data file as 'data.csv' in the public/ directory

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint code quality checks
```

## 📊 Data Requirements

### Expected CSV Format
The application processes transaction data with the following structure:

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
RuleTune includes sophisticated sample investigations:

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
```env
# Optional API configurations
VITE_API_URL=your-backend-api-url
VITE_OPENAI_API_KEY=your-openai-key
```

### Customization Options

#### Styling & Themes
- Modify `tailwind.config.js` for design system changes
- Custom CSS in `src/index.css` for Fortify theme adjustments
- Component-level styling with Tailwind utility classes

#### Data Processing
- Extend `sqliteEngine.js` for custom SQL functions
- Modify `chartDataProcessor.js` for visualization enhancements
- Update `investigationService.js` for storage customizations

#### Cell Extensions
Add new cell types by:
1. Creating component in `src/components/cells/`
2. Registering in `NotebookContainer.jsx` 
3. Adding to cell creation menu

## 🏭 Production Deployment

### Build Process
```bash
# Create optimized production build
npm run build

# Files generated in dist/ directory
# Ready for deployment to any static hosting service
```

### Deployment Options
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN Distribution**: CloudFront, CloudFlare
- **Container Deployment**: Docker with nginx

### Performance Considerations
- Client-side SQLite processing scales to ~100K transactions
- Large datasets (>1M rows) may require server-side processing
- Chart rendering optimized for up to 10K data points

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

1. **Data Loading Problems**
   - Ensure `data.csv` is in `public/` directory
   - Verify CSV format matches expected structure
   - Check browser console for parsing errors

2. **Performance Issues**
   - Large datasets (>100K rows) may slow processing
   - Consider data sampling for initial analysis
   - Chrome DevTools can help identify bottlenecks

3. **Chart Rendering Problems** 
   - Verify data types match chart requirements
   - Check ECharts documentation for configuration options
   - Ensure numeric fields are properly typed

### Getting Support
- Check browser developer console for error messages
- Verify Node.js version: `node --version`
- Ensure all dependencies installed: `npm install`
- Review sample investigations for usage patterns

## 📄 License

This project is proprietary and confidential. All rights reserved.