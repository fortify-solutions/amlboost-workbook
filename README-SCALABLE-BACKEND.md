# AMLBoost Scalable Backend Architecture

This document describes the new scalable backend architecture that enables AMLBoost to handle millions of transactions efficiently.

## Architecture Overview

The new architecture replaces the client-side SQLite limitation with a robust backend system:

```
Frontend (React)          Backend (Node.js)           Database
├─ Virtual Tables          ├─ Express API Server       ├─ PostgreSQL
├─ API Client             ├─ CSV Upload Handler        │  └─ Optimized indexes
├─ Progressive Loading    ├─ Query Processing          ├─ Redis Cache (optional)
└─ Background Sync        └─ Result Pagination         └─ File Storage
```

## Key Improvements

- **Million+ Transaction Support**: PostgreSQL backend handles datasets of any size
- **Virtual Scrolling**: Frontend displays large result sets efficiently
- **Query Caching**: Frequently used queries cached for instant results
- **Background Processing**: CSV uploads processed asynchronously
- **Streaming Results**: Large queries delivered in paginated chunks
- **Performance Monitoring**: Query performance insights and optimization

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v13 or higher)
3. **npm** or **yarn**

### 1. Database Setup

#### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### Create Database and User

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create database and user
CREATE DATABASE amlboost;
CREATE USER amlboost_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE amlboost TO amlboost_user;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your database credentials
# Update DB_PASSWORD with your secure password
```

#### Environment Configuration

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=3001

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=amlboost
DB_USER=amlboost_user
DB_PASSWORD=your_secure_password

# Optional: Redis for caching
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

#### Run Database Migrations

```bash
# Create database tables and indexes
npm run migrate
```

#### Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:3001`

### 3. Frontend Setup

The frontend automatically detects and uses the new backend when available.

```bash
# Navigate to project root
cd ..

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Using the New Architecture

### CSV Upload

1. **Large File Support**: Upload CSV files up to 500MB
2. **Background Processing**: Files processed asynchronously in the backend
3. **Progress Monitoring**: Real-time upload and processing status
4. **Smart Indexing**: Automatic database indexes for optimal query performance

### Query Execution

1. **Pagination**: Large result sets delivered in pages (1000 rows default)
2. **Virtual Scrolling**: Smooth scrolling through millions of rows
3. **Query Caching**: Identical queries return instantly from cache
4. **Performance Metrics**: See query execution times and cache status

### Data Management

- **Sample Data**: Preview data before running heavy queries
- **Data Quality**: Built-in data quality reports and statistics
- **Export**: Export query results to CSV for further analysis
- **Schema Info**: Detailed column information and data types

## Performance Features

### Query Optimization

- **Intelligent Indexing**: Automatic indexes on commonly queried columns
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Specialized indexes for filtered queries (fraud detection, etc.)

### Caching Strategy

- **Query Result Caching**: Frequently used queries cached for 1 hour
- **Smart Cache Management**: Automatic cleanup of expired cache entries
- **Hit Rate Monitoring**: Track cache performance and popular queries

### Memory Management

- **Streaming CSV Processing**: Large files processed in chunks
- **Batched Inserts**: Database writes optimized in 1000-row batches
- **Connection Pooling**: Efficient database connection management

## Migration from Old Architecture

The new architecture maintains compatibility with existing investigations:

### Automatic Migration

1. Start the new backend server
2. Existing frontend code works without changes
3. Upload your CSV data through the new upload API
4. All existing cells and queries continue to work

### Manual Steps (if needed)

1. **Export Current Data**: Use the old system to export important datasets
2. **Upload to New System**: Use the new CSV upload feature
3. **Verify Queries**: Test existing queries with the new system
4. **Update Bookmarks**: Update any saved investigation URLs

## API Endpoints

### Upload Endpoints
- `POST /api/upload/csv` - Upload CSV file
- `GET /api/upload/status/:datasetId` - Check upload status
- `GET /api/upload/datasets` - List all datasets

### Query Endpoints
- `POST /api/query/execute` - Execute SQL query with pagination
- `GET /api/query/schema` - Get table schema information
- `GET /api/query/stats` - Get database statistics
- `DELETE /api/query/cache` - Clear query cache

### Data Endpoints
- `GET /api/data/sample` - Get sample data
- `GET /api/data/columns` - Get column information
- `GET /api/data/quality` - Get data quality report
- `GET /api/data/export` - Export data as CSV

## Troubleshooting

### Common Issues

#### Backend Connection Failed
```
Error: Backend unavailable: 500
```
**Solution**: Ensure backend server is running on port 3001

#### Database Connection Error
```
Error: Database connection failed
```
**Solutions**:
1. Check PostgreSQL is running: `brew services list | grep postgresql`
2. Verify database credentials in `.env` file
3. Test connection: `psql -h localhost -U amlboost_user -d amlboost`

#### CSV Upload Fails
```
Error: Only CSV files are allowed
```
**Solutions**:
1. Ensure file has `.csv` extension
2. Check file size is under 500MB
3. Verify CSV format is valid (proper headers, quoted fields)

#### Queries Timeout
```
Error: Query execution timeout
```
**Solutions**:
1. Optimize query with proper WHERE clauses
2. Check database indexes are created
3. Break large queries into smaller chunks

### Performance Optimization

#### Slow Queries
1. **Add Indexes**: Create indexes on frequently queried columns
2. **Limit Results**: Use LIMIT clauses for large datasets
3. **Use Filters**: Add WHERE clauses to reduce result sets
4. **Check Cache**: Verify query caching is working

#### Memory Issues
1. **Reduce Batch Size**: Lower CSV processing batch size
2. **Clear Cache**: Remove old cached queries
3. **Restart Services**: Restart backend to free memory
4. **Monitor Usage**: Use database monitoring tools

## Production Deployment

### Environment Setup

1. **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
2. **Caching**: Deploy Redis for query caching
3. **Load Balancing**: Use nginx or cloud load balancer
4. **Monitoring**: Set up database and application monitoring

### Security

1. **Database Security**: Use strong passwords, SSL connections
2. **API Security**: Implement authentication and rate limiting
3. **File Upload**: Validate and scan uploaded files
4. **Network Security**: Use HTTPS and secure networks

### Scaling

1. **Database Scaling**: Use read replicas for query-heavy workloads
2. **Application Scaling**: Deploy multiple backend instances
3. **Caching**: Use Redis cluster for distributed caching
4. **Storage**: Use cloud storage for uploaded files

## Support

For issues or questions about the scalable backend architecture:

1. Check the troubleshooting section above
2. Review logs in `backend/logs/` directory
3. Monitor database performance using PostgreSQL tools
4. Create GitHub issues for bugs or feature requests

---

**Next Steps**: After setup is complete, upload your transaction data and enjoy the improved performance for large-scale AML investigations!