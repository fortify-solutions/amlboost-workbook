// Sample AML investigations showcasing all platform functionality

export const sampleInvestigations = [
  {
    id: "inv_advanced_fraud_ml_001",
    name: "Advanced Fraud Detection with ML Features",
    description: "Comprehensive fraud investigation using computed states, risk scoring, behavioral analysis, and predictive modeling to identify sophisticated fraud patterns.",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T14:45:00.000Z",
    version: "1.0",
    cells: [
      {
        id: 1,
        type: 'markdown',
        content: `# Advanced Fraud Detection with ML Features 🚨

## Investigation Overview
**Investigation ID:** AFD-ML-2024-001  
**Risk Level:** 🔴 CRITICAL  
**Classification:** Machine Learning Enhanced Fraud Detection  
**Analyst:** Sarah Chen, Senior AML Investigator

## Scope & Objectives
This investigation leverages advanced analytical techniques including:
- **Computed Risk States** for real-time scoring
- **Behavioral Pattern Analysis** using window functions  
- **Geographic Risk Assessment** with cross-border patterns
- **Velocity-based Detection** for rapid transaction sequences
- **AI-Assisted Analysis** for pattern recognition

## Key Metrics Monitored
- User transaction velocity (rolling 24hr windows)
- Geographic dispersion scores
- Payment method risk correlation
- Merchant category anomalies
- Amount pattern clustering

---
*Investigation initiated following multiple high-risk alerts in fraud detection system*`,
        collapsed: false,
        executed: true,
        executionTime: null
      },
      {
        id: 2,
        type: 'state',
        title: 'Computed Risk States',
        states: [
          {
            name: 'user_transaction_count',
            description: 'Total number of transactions per user',
            query: 'COUNT(*) OVER (PARTITION BY user_id)',
            computationType: 'aggregate_count',
            field: '*',
            condition: '',
            windowDays: 30,
            groupBy: 'user_id',
            persistent: false
          },
          {
            name: 'user_fraud_rate',
            description: 'Percentage of fraudulent transactions per user',
            query: 'ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) OVER (PARTITION BY user_id), 2)',
            computationType: 'risk_score',
            field: 'fraud',
            condition: 'fraud = 1',
            windowDays: 30,
            groupBy: 'user_id',
            persistent: false
          },
          {
            name: 'merchant_success_rate',
            description: 'Merchant transaction success rate (non-declined transactions)',
            query: 'ROUND(SUM(CASE WHEN decline = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) OVER (PARTITION BY merchant_id), 2)',
            computationType: 'aggregate_count',
            field: 'decline',
            condition: 'decline = 0',
            windowDays: 30,
            groupBy: 'merchant_id',
            persistent: false
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '1.2s'
      },
      {
        id: 3,
        type: 'data',
        title: 'High-Risk Users with Computed States',
        query: `SELECT 
  user_id,
  COUNT(*) as total_transactions,
  SUM(charged_amount) as total_volume,
  COUNT(DISTINCT merchant_id) as unique_merchants,
  COUNT(DISTINCT merchant_country) as countries_used,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_transactions,
  SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END) as declined_transactions,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate,
  MAX(txn_date_time) as last_transaction
FROM transactions 
GROUP BY user_id
HAVING total_transactions > 10
ORDER BY fraud_rate DESC, total_volume DESC
LIMIT 20`,
        columns: ['user_id', 'total_transactions', 'total_volume', 'unique_merchants', 'countries_used', 'fraud_transactions', 'declined_transactions', 'fraud_rate', 'last_transaction'],
        visibleColumns: ['user_id', 'total_transactions', 'total_volume', 'unique_merchants', 'countries_used', 'fraud_rate'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '2.1s',
        rowCount: 47,
        queryResults: []
      },
      {
        id: 4,
        type: 'chart',
        title: 'User Velocity vs Volume Risk Matrix',
        chartType: 'scatter',
        dataSource: 'query',
        xAxis: 'transaction_count',
        yAxis: 'total_volume',
        colorBy: 'fraud_rate',
        query: `SELECT 
  user_id,
  COUNT(*) as transaction_count,
  SUM(charged_amount) as total_volume,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate
FROM transactions 
GROUP BY user_id
HAVING transaction_count > 5
ORDER BY transaction_count DESC, total_volume DESC
LIMIT 50`,
        collapsed: false,
        executed: true,
        executionTime: '1.7s',
        queryResults: [
          {user_id: 'user_001', transaction_count: 25, total_volume: 15420.50, fraud_rate: 8.0},
          {user_id: 'user_002', transaction_count: 18, total_volume: 9876.25, fraud_rate: 5.6},
          {user_id: 'user_003', transaction_count: 32, total_volume: 22150.75, fraud_rate: 12.5},
          {user_id: 'user_004', transaction_count: 14, total_volume: 6543.00, fraud_rate: 7.1},
          {user_id: 'user_005', transaction_count: 21, total_volume: 13890.40, fraud_rate: 9.5}
        ]
      },
      {
        id: 5,
        type: 'data',
        title: 'Geographic Risk Analysis',
        query: `SELECT 
  merchant_country,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as transaction_count,
  SUM(charged_amount) as total_volume,
  AVG(charged_amount) as avg_amount,
  SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END) as declined_txns,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_txns,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate,
  COUNT(DISTINCT mcc) as merchant_categories
FROM transactions 
GROUP BY merchant_country
HAVING transaction_count > 20
ORDER BY fraud_rate DESC, total_volume DESC`,
        columns: ['merchant_country', 'unique_users', 'transaction_count', 'total_volume', 'avg_amount', 'declined_txns', 'fraud_txns', 'fraud_rate', 'merchant_categories'],
        visibleColumns: ['merchant_country', 'unique_users', 'transaction_count', 'total_volume', 'fraud_rate', 'merchant_categories'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '1.8s',
        rowCount: 23,
        queryResults: []
      },
      {
        id: 6,
        type: 'chart',
        title: 'Fraud Rate by Country (Geographic Heatmap)',
        chartType: 'bar',
        dataSource: 'query',
        xAxis: 'merchant_country',
        yAxis: 'fraud_rate',
        query: `SELECT 
  merchant_country,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate,
  COUNT(*) as sample_size
FROM transactions 
GROUP BY merchant_country
HAVING COUNT(*) > 50
ORDER BY fraud_rate DESC
LIMIT 15`,
        collapsed: false,
        executed: true,
        executionTime: '1.3s',
        queryResults: [
          {merchant_country: 'RUS', fraud_rate: 15.2, sample_size: 127},
          {merchant_country: 'BGR', fraud_rate: 12.8, sample_size: 89},
          {merchant_country: 'ROU', fraud_rate: 11.4, sample_size: 156},
          {merchant_country: 'UKR', fraud_rate: 10.9, sample_size: 203},
          {merchant_country: 'PAN', fraud_rate: 8.7, sample_size: 245},
          {merchant_country: 'BRA', fraud_rate: 7.3, sample_size: 312},
          {merchant_country: 'MEX', fraud_rate: 6.8, sample_size: 187}
        ]
      },
      {
        id: 7,
        type: 'data',
        title: 'Suspicious Payment Patterns',
        query: `SELECT 
  user_id,
  merchant_name,
  COUNT(*) as repeat_attempts,
  GROUP_CONCAT(DISTINCT CAST(charged_amount AS TEXT)) as attempted_amounts,
  GROUP_CONCAT(DISTINCT outcome) as outcomes,
  MIN(txn_date_time) as first_attempt,
  MAX(txn_date_time) as last_attempt,
  SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END) as decline_count,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_count
FROM transactions 
GROUP BY user_id, merchant_id
HAVING repeat_attempts > 3 
   AND decline_count > 0
ORDER BY repeat_attempts DESC, decline_count DESC
LIMIT 15`,
        columns: ['user_id', 'merchant_name', 'repeat_attempts', 'attempted_amounts', 'outcomes', 'first_attempt', 'last_attempt', 'decline_count', 'fraud_count'],
        visibleColumns: ['user_id', 'merchant_name', 'repeat_attempts', 'attempted_amounts', 'decline_count', 'fraud_count'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '2.3s',
        rowCount: 12,
        queryResults: []
      },
      {
        id: 8,
        type: 'ai',
        title: 'AI Fraud Pattern Analysis',
        messages: [
          {
            role: 'user',
            content: 'Based on the data above, what are the key fraud patterns we should be monitoring? Focus on the high-risk users and geographic trends.',
            timestamp: '2024-01-15T11:30:00.000Z'
          },
          {
            role: 'assistant', 
            content: `Based on the comprehensive fraud analysis, I've identified several critical patterns that warrant immediate attention:

## Key Fraud Indicators

**1. High-Volume User Risks**
- Users with high transaction counts show elevated fraud patterns
- Geographic dispersion (>3 countries) combined with high volume indicates potential risk
- Recommend: Enhanced monitoring for users with diverse geographic activity

**2. Merchant Quality Correlation**
- Users targeting merchants with low success rates show elevated fraud
- Merchants with high decline rates correlate with increased fraud risk
- Pattern: Fraudsters often target merchants with weaker fraud detection

**3. Geographic Clusters**
- Certain countries show disproportionate fraud rates despite low volume
- Recommend: Enhanced due diligence for transactions from high-risk jurisdictions
- Consider implementing country-based risk scoring

**4. Behavioral Anomalies**
- Repeated failed attempts followed by successful transactions
- Amount testing patterns (multiple small amounts, then large)
- Time-based clustering (multiple attempts within short windows)

## Recommended Actions
1. Implement dynamic velocity limits based on user_fraud_score
2. Enhanced monitoring for cross-border transactions
3. Real-time merchant quality scoring integration
4. Automated alerts for repeat attempt patterns`,
            timestamp: '2024-01-15T11:35:00.000Z'
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '4.2s'
      },
      {
        id: 9,
        type: 'chart',
        title: 'Temporal Fraud Distribution',
        chartType: 'line',
        dataSource: 'query',
        xAxis: 'hour_of_day',
        yAxis: 'fraud_count',
        query: `SELECT 
  strftime('%H', txn_date_time) as hour_of_day,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_count,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate
FROM transactions 
GROUP BY strftime('%H', txn_date_time)
ORDER BY hour_of_day`,
        collapsed: false,
        executed: true,
        executionTime: '1.5s',
        queryResults: [
          {hour_of_day: '00', total_transactions: 156, fraud_count: 23, fraud_rate: 14.7},
          {hour_of_day: '01', total_transactions: 142, fraud_count: 19, fraud_rate: 13.4},
          {hour_of_day: '02', total_transactions: 98, fraud_count: 18, fraud_rate: 18.4},
          {hour_of_day: '03', total_transactions: 87, fraud_count: 16, fraud_rate: 18.4},
          {hour_of_day: '04', total_transactions: 76, fraud_count: 12, fraud_rate: 15.8},
          {hour_of_day: '05', total_transactions: 89, fraud_count: 8, fraud_rate: 9.0},
          {hour_of_day: '06', total_transactions: 134, fraud_count: 12, fraud_rate: 9.0},
          {hour_of_day: '07', total_transactions: 187, fraud_count: 15, fraud_rate: 8.0},
          {hour_of_day: '08', total_transactions: 234, fraud_count: 18, fraud_rate: 7.7},
          {hour_of_day: '09', total_transactions: 289, fraud_count: 21, fraud_rate: 7.3},
          {hour_of_day: '10', total_transactions: 312, fraud_count: 19, fraud_rate: 6.1},
          {hour_of_day: '11', total_transactions: 298, fraud_count: 17, fraud_rate: 5.7},
          {hour_of_day: '12', total_transactions: 345, fraud_count: 22, fraud_rate: 6.4},
          {hour_of_day: '13', total_transactions: 367, fraud_count: 25, fraud_rate: 6.8},
          {hour_of_day: '14', total_transactions: 334, fraud_count: 20, fraud_rate: 6.0},
          {hour_of_day: '15', total_transactions: 298, fraud_count: 19, fraud_rate: 6.4},
          {hour_of_day: '16', total_transactions: 276, fraud_count: 18, fraud_rate: 6.5},
          {hour_of_day: '17', total_transactions: 245, fraud_count: 16, fraud_rate: 6.5},
          {hour_of_day: '18', total_transactions: 213, fraud_count: 14, fraud_rate: 6.6},
          {hour_of_day: '19', total_transactions: 198, fraud_count: 15, fraud_rate: 7.6},
          {hour_of_day: '20', total_transactions: 187, fraud_count: 17, fraud_rate: 9.1},
          {hour_of_day: '21', total_transactions: 165, fraud_count: 18, fraud_rate: 10.9},
          {hour_of_day: '22', total_transactions: 154, fraud_count: 20, fraud_rate: 13.0},
          {hour_of_day: '23', total_transactions: 167, fraud_count: 24, fraud_rate: 14.4}
        ]
      },
      {
        id: 10,
        type: 'markdown',
        content: `## Investigation Summary & Recommendations

### Key Findings
1. **High-risk users** identified through transaction pattern analysis
2. **Geographic fraud concentration** in specific countries requiring enhanced monitoring  
3. **Temporal patterns** show fraud distribution throughout the day
4. **Merchant quality correlation** strongly predicts transaction success likelihood

### Risk Mitigation Actions
✅ **Immediate (24h)**
- Flag users with high transaction counts and geographic diversity for manual review
- Implement country-based transaction limits for high-risk jurisdictions
- Enhanced monitoring for merchants with low success rates

🔄 **Short-term (1 week)**
- Deploy ML model incorporating computed risk states
- Enhance geographic risk scoring algorithm
- Implement behavioral pattern matching for repeat attempts

📈 **Long-term (1 month)**
- Advanced graph analytics for merchant-user relationship mapping
- Real-time risk scoring API integration
- Automated case management workflow

---
**Investigation Status:** ACTIVE MONITORING  
**Next Review:** 2024-01-22  
**Risk Level:** CONTAINED with ongoing surveillance`
      }
    ]
  },

  {
    id: "inv_geographic_network_002",
    name: "Cross-Border Financial Network Analysis",
    description: "Advanced geographic transaction flow analysis identifying suspicious cross-border networks, trade-based money laundering, and jurisdictional arbitrage patterns.",
    createdAt: "2024-01-14T09:15:00.000Z",
    updatedAt: "2024-01-14T16:20:00.000Z",
    version: "1.0",
    cells: [
      {
        id: 1,
        type: 'markdown',
        content: `# Cross-Border Financial Network Analysis 🌍

## Investigation Framework
**Investigation ID:** CBFNA-2024-002  
**Classification:** 🟡 Trade-Based Money Laundering (TBML)  
**Jurisdiction Focus:** Multi-national transaction flows  
**Lead Analyst:** Marcus Rodriguez, International AML Specialist

## Strategic Objectives
- Map suspicious cross-border transaction networks
- Identify trade mispricing and invoice manipulation
- Detect jurisdictional arbitrage patterns
- Analyze correspondent banking relationships
- Monitor sanctions evasion attempts

## Regulatory Framework
- **BSA/AML** compliance for cross-border reporting
- **OFAC** sanctions screening integration  
- **FinCEN** geographic targeting orders
- **FATF** risk-based approach implementation

---
*This investigation was triggered by unusual transaction patterns involving multiple high-risk jurisdictions*`,
        collapsed: false,
        executed: true,
        executionTime: null
      },
      {
        id: 2,
        type: 'state',
        title: 'Geographic Risk Computation',
        states: [
          {
            name: 'user_country_diversity',
            description: 'Number of distinct countries per user (geographic spread)',
            query: '(SELECT COUNT(DISTINCT merchant_country) FROM transactions t2 WHERE t2.user_id = transactions.user_id)',
            computationType: 'aggregate_count',
            field: '*',
            condition: '',
            windowDays: 30,
            groupBy: 'user_id',
            persistent: false
          },
          {
            name: 'cross_border_volume',
            description: 'Total cross-border transaction volume per user',
            query: '(SELECT SUM(charged_amount) FROM transactions t2 WHERE t2.user_id = transactions.user_id AND t2.merchant_country != "USA")',
            computationType: 'aggregate_sum',
            field: 'charged_amount',
            condition: 'merchant_country != "USA"',
            windowDays: 30,
            groupBy: 'user_id',
            persistent: false
          },
          {
            name: 'merchant_country_risk',
            description: 'Average fraud rate for each merchant country',
            query: '(SELECT AVG(CASE WHEN fraud = 1 THEN 1.0 ELSE 0.0 END) FROM transactions t2 WHERE t2.merchant_country = transactions.merchant_country)',
            computationType: 'aggregate_count',
            field: 'fraud',
            condition: 'fraud = 1',
            windowDays: 90,
            groupBy: 'merchant_country',
            persistent: false
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '2.8s'
      },
      {
        id: 3,
        type: 'data',
        title: 'High-Risk Cross-Border Users',
        query: `SELECT 
  user_id,
  COUNT(DISTINCT merchant_country) as country_diversity,
  SUM(CASE WHEN merchant_country != 'USA' THEN charged_amount ELSE 0 END) as cross_border_volume,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT merchant_id) as unique_merchants,
  ROUND(AVG(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0, 2) as fraud_rate,
  SUM(CASE WHEN charged_amount > 1000 THEN 1 ELSE 0 END) as high_value_txns,
  GROUP_CONCAT(DISTINCT merchant_country) as countries_used
FROM transactions 
GROUP BY user_id
HAVING country_diversity > 2 
   AND total_transactions > 10
ORDER BY country_diversity DESC, cross_border_volume DESC
LIMIT 25`,
        columns: ['user_id', 'country_diversity', 'cross_border_volume', 'total_transactions', 'unique_merchants', 'fraud_rate', 'high_value_txns', 'countries_used'],
        visibleColumns: ['user_id', 'country_diversity', 'cross_border_volume', 'total_transactions', 'fraud_rate', 'countries_used'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '3.1s',
        rowCount: 24,
        queryResults: []
      },
      {
        id: 4,
        type: 'chart',
        title: 'Geographic Diversity vs Transaction Volume',
        chartType: 'bubble',
        dataSource: 'query',
        xAxis: 'country_diversity',
        yAxis: 'cross_border_volume', 
        zAxis: 'total_transactions',
        colorBy: 'fraud_rate',
        query: `SELECT 
  user_id,
  COUNT(DISTINCT merchant_country) as country_diversity,
  SUM(CASE WHEN merchant_country != 'USA' THEN charged_amount ELSE 0 END) as cross_border_volume,
  COUNT(*) as total_transactions,
  ROUND(AVG(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0, 2) as fraud_rate
FROM transactions 
GROUP BY user_id
HAVING country_diversity > 1 AND total_transactions > 5`,
        collapsed: false,
        executed: true,
        executionTime: '2.2s',
        queryResults: [
          {user_id: 'user_001', country_diversity: 4, cross_border_volume: 25420.50, total_transactions: 28, fraud_rate: 8.5},
          {user_id: 'user_002', country_diversity: 3, cross_border_volume: 18750.25, total_transactions: 22, fraud_rate: 6.2},
          {user_id: 'user_003', country_diversity: 5, cross_border_volume: 32150.75, total_transactions: 35, fraud_rate: 11.8},
          {user_id: 'user_004', country_diversity: 2, cross_border_volume: 12890.40, total_transactions: 18, fraud_rate: 4.9},
          {user_id: 'user_005', country_diversity: 6, cross_border_volume: 41230.60, total_transactions: 42, fraud_rate: 15.2}
        ]
      },
      {
        id: 5,
        type: 'data',
        title: 'Suspicious Country Corridors',
        query: `SELECT 
  'USA' as origin_country,
  merchant_country as destination_country,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as transaction_count,
  SUM(charged_amount) as total_volume,
  AVG(charged_amount) as avg_amount,
  merchant_country_risk as destination_risk,
  SUM(CASE WHEN charged_amount BETWEEN 9000 AND 10000 THEN 1 ELSE 0 END) as structuring_indicators
FROM transactions 
WHERE merchant_country != 'USA'
GROUP BY merchant_country
HAVING transaction_count > 50
ORDER BY destination_risk DESC, structuring_indicators DESC`,
        columns: ['origin_country', 'destination_country', 'unique_users', 'transaction_count', 'total_volume', 'avg_amount', 'destination_risk', 'structuring_indicators'],
        visibleColumns: ['destination_country', 'unique_users', 'transaction_count', 'total_volume', 'destination_risk', 'structuring_indicators'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '2.7s',
        rowCount: 18,
        queryResults: []
      },
      {
        id: 6,
        type: 'chart',
        title: 'Transaction Flow Network (Country-to-Country)',
        chartType: 'bar',
        dataSource: 'query',
        xAxis: 'destination_risk',
        yAxis: 'destination_country',
        query: `SELECT 
  merchant_country as destination_country,
  SUM(charged_amount) as total_volume,
  AVG(merchant_country_risk) as destination_risk,
  COUNT(*) as flow_count
FROM transactions 
WHERE merchant_country != 'USA'
GROUP BY merchant_country
HAVING flow_count > 20
ORDER BY total_volume DESC
LIMIT 15`,
        collapsed: false,
        executed: true,
        executionTime: '1.9s'
      },
      {
        id: 7,
        type: 'data',
        title: 'Trade Mispricing Indicators',
        query: `SELECT 
  user_id,
  merchant_country,
  merchant_name,
  mcc,
  COUNT(*) as transaction_frequency,
  AVG(charged_amount) as avg_amount,
  MIN(charged_amount) as min_amount,
  MAX(charged_amount) as max_amount,
  (MAX(charged_amount) - MIN(charged_amount)) as amount_variance,
  CASE 
    WHEN AVG(charged_amount) > 8000 AND merchant_country IN ('CHN', 'HKG', 'SGP') THEN 'HIGH'
    WHEN AVG(charged_amount) > 5000 AND merchant_country IN ('BRA', 'MEX', 'ARE') THEN 'MEDIUM'
    ELSE 'LOW'
  END as mispricing_risk
FROM transactions 
WHERE merchant_country != 'USA' 
  AND mcc IN ('5311', '5399', '5812', '7372') -- Trade-related MCCs
GROUP BY user_id, merchant_id
HAVING transaction_frequency > 5 
   AND amount_variance > 2000
ORDER BY mispricing_risk DESC, avg_amount DESC`,
        columns: ['user_id', 'merchant_country', 'merchant_name', 'mcc', 'transaction_frequency', 'avg_amount', 'min_amount', 'max_amount', 'amount_variance', 'mispricing_risk'],
        visibleColumns: ['user_id', 'merchant_country', 'mcc', 'avg_amount', 'amount_variance', 'mispricing_risk'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '2.4s',
        rowCount: 15,
        queryResults: []
      },
      {
        id: 8,
        type: 'ai',
        title: 'AI Geographic Risk Assessment',
        messages: [
          {
            role: 'user',
            content: 'Analyze the cross-border transaction patterns above. What are the key risk indicators for trade-based money laundering and sanctions evasion?',
            timestamp: '2024-01-14T12:30:00.000Z'
          },
          {
            role: 'assistant',
            content: `Based on the geographic network analysis, several critical risk patterns emerge:

## Primary Risk Indicators

**1. Geographic Dispersion Anomalies**
- 24 users showing >3 country diversity with high volumes
- Users with >$10K cross-border volume warrant enhanced due diligence
- Concentration in high-risk corridors: USA→CHN, USA→BRA, USA→HKG

**2. Trade Mispricing Red Flags**
- Significant amount variance (>$2K) in same merchant relationships
- Unusual pricing in trade-related MCCs (5311, 5399, 5812, 7372)
- Average amounts >$8K to China/Hong Kong/Singapore raise TBML concerns

**3. Structuring Indicators**
- Multiple transactions just under $10K threshold
- Pattern analysis suggests potential reporting threshold avoidance
- Recommend CTR filing review for affected corridors

**4. Network Analysis Insights**
- Correspondent banking relationship concentration
- Shared merchant utilization across high-risk users
- Timing correlation suggests coordinated activity

## Sanctions Evasion Concerns
- Shell company indicators in merchant names
- Rapid geographic switching patterns
- High-risk jurisdiction concentration requires OFAC screening

## Recommended Controls
1. **Enhanced Due Diligence**: All users with >3 country diversity
2. **Trade Documentation Review**: Transactions >$5K to high-risk countries  
3. **Real-time OFAC Screening**: Enhanced monitoring for flagged corridors
4. **SAR Filing Consideration**: Users showing multiple risk factors

**Priority Countries for Enhanced Monitoring:** China, Hong Kong, Brazil, Singapore, UAE`,
            timestamp: '2024-01-14T12:38:00.000Z'
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '5.1s'
      }
    ]
  },

  {
    id: "inv_merchant_ecosystem_003", 
    name: "Merchant Ecosystem & Network Analysis",
    description: "Deep dive into merchant behavior patterns, network relationships, and ecosystem-wide risks including payment facilitator analysis and merchant category trends.",
    createdAt: "2024-01-13T11:00:00.000Z",
    updatedAt: "2024-01-13T17:30:00.000Z", 
    version: "1.0",
    cells: [
      {
        id: 1,
        type: 'markdown',
        content: `# Merchant Ecosystem & Network Analysis 🏪

## Investigation Scope
**Investigation ID:** MENA-2024-003  
**Risk Category:** 🟠 Merchant Risk Assessment & Network Analysis  
**Focus Areas:** Payment facilitators, aggregators, and merchant networks  
**Analyst Team:** Jennifer Wu (Lead), David Kim (Data Scientist)

## Key Investigation Areas
- **Merchant Performance Analytics** - Success rates, decline patterns
- **Network Relationship Mapping** - Shared infrastructure and ownership
- **Payment Facilitator Risk** - Sub-merchant monitoring
- **Category Code Analysis** - MCC risk profiling
- **Geographic Merchant Clusters** - Regional risk concentration

## Compliance Framework
- **Merchant Due Diligence** requirements
- **Payment Card Industry** standards compliance
- **Anti-Money Laundering** merchant monitoring
- **Know Your Business Customer** (KYBC) protocols

---
*Investigation initiated following merchant concentration risk alerts and unusual transaction patterns across merchant networks*`,
        collapsed: false,
        executed: true,
        executionTime: null
      },
      {
        id: 2,
        type: 'state',
        title: 'Merchant Performance States',
        states: [
          {
            name: 'merchant_success_rate',
            description: 'Overall transaction success rate per merchant',
            query: '(SELECT AVG(CASE WHEN outcome = "TN" THEN 1.0 ELSE 0.0 END) FROM transactions t2 WHERE t2.merchant_id = transactions.merchant_id)',
            computationType: 'aggregate_count',
            field: '*',
            condition: 'outcome = "TN"',
            windowDays: 30,
            groupBy: 'merchant_id',
            persistent: false
          },
          {
            name: 'merchant_user_diversity',
            description: 'Number of unique users per merchant (concentration risk)',
            query: '(SELECT COUNT(DISTINCT user_id) FROM transactions t2 WHERE t2.merchant_id = transactions.merchant_id)',
            computationType: 'aggregate_count',
            field: '*',
            condition: '',
            windowDays: 30,
            groupBy: 'merchant_id',
            persistent: false
          },
          {
            name: 'merchant_daily_volume',
            description: 'Average daily transaction volume per merchant',
            query: '(SELECT AVG(daily_volume) FROM (SELECT DATE(txn_date_time), SUM(charged_amount) as daily_volume FROM transactions t2 WHERE t2.merchant_id = transactions.merchant_id GROUP BY DATE(txn_date_time)))',
            computationType: 'aggregate_sum',
            field: 'charged_amount',
            condition: '',
            windowDays: 30,
            groupBy: 'merchant_id',
            persistent: false
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '3.2s'
      },
      {
        id: 3,
        type: 'data',
        title: 'High-Risk Merchant Profile Analysis',
        query: `SELECT 
  merchant_name,
  merchant_country,
  mcc,
  ROUND((COUNT(*) - SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*), 2) as success_rate,
  COUNT(DISTINCT user_id) as user_diversity,
  ROUND(SUM(charged_amount) / COUNT(DISTINCT DATE(txn_date_time)), 2) as daily_avg_volume,
  COUNT(*) as total_transactions,
  SUM(charged_amount) as total_volume,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_count,
  SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END) as decline_count,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate,
  COUNT(DISTINCT DATE(txn_date_time)) as active_days
FROM transactions 
GROUP BY merchant_id
HAVING total_transactions > 20
ORDER BY fraud_rate DESC, success_rate ASC
LIMIT 25`,
        columns: ['merchant_name', 'merchant_country', 'mcc', 'success_rate', 'user_diversity', 'daily_avg_volume', 'total_transactions', 'total_volume', 'fraud_count', 'decline_count', 'fraud_rate', 'active_days'],
        visibleColumns: ['merchant_name', 'merchant_country', 'mcc', 'success_rate', 'fraud_rate', 'user_diversity', 'total_volume'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '4.1s',
        rowCount: 32,
        queryResults: []
      },
      {
        id: 4,
        type: 'chart',
        title: 'Merchant Risk Matrix: Success Rate vs User Diversity',
        chartType: 'scatter',
        dataSource: 'query',
        xAxis: 'success_rate',
        yAxis: 'user_diversity',
        colorBy: 'fraud_rate',
        sizeBy: 'total_volume',
        query: `SELECT 
  merchant_name,
  ROUND((COUNT(*) - SUM(CASE WHEN decline = 1 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*), 2) as success_rate,
  COUNT(DISTINCT user_id) as user_diversity,
  SUM(charged_amount) as total_volume,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as fraud_rate
FROM transactions 
GROUP BY merchant_id
HAVING COUNT(*) > 15`,
        collapsed: false,
        executed: true,
        executionTime: '2.8s',
        queryResults: [
          {merchant_name: 'TechCorp Solutions', success_rate: 92.5, user_diversity: 156, total_volume: 245670.50, fraud_rate: 2.1},
          {merchant_name: 'Global Retail Inc', success_rate: 87.3, user_diversity: 203, total_volume: 189430.25, fraud_rate: 4.2},
          {merchant_name: 'FastFood Chain', success_rate: 95.1, user_diversity: 89, total_volume: 87560.75, fraud_rate: 1.8},
          {merchant_name: 'Fashion Store', success_rate: 82.7, user_diversity: 134, total_volume: 156890.40, fraud_rate: 6.5},
          {merchant_name: 'Electronics Hub', success_rate: 88.9, user_diversity: 178, total_volume: 298740.60, fraud_rate: 3.7}
        ]
      },
      {
        id: 5,
        type: 'data',
        title: 'Merchant Category Code Risk Analysis',
        query: `SELECT 
  mcc,
  CASE 
    WHEN mcc = '5311' THEN 'Department Stores'
    WHEN mcc = '5411' THEN 'Grocery Stores'
    WHEN mcc = '5812' THEN 'Eating Places'  
    WHEN mcc = '5999' THEN 'Miscellaneous Retail'
    WHEN mcc = '7372' THEN 'Computer Services'
    WHEN mcc = '8999' THEN 'Professional Services'
    ELSE 'Other'
  END as category_description,
  COUNT(DISTINCT merchant_id) as merchant_count,
  COUNT(*) as total_transactions,
  SUM(charged_amount) as total_volume,
  AVG(merchant_success_rate) as avg_success_rate,
  SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) as fraud_count,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as category_fraud_rate,
  AVG(merchant_daily_volume) as avg_daily_volume
FROM transactions 
WHERE mcc IS NOT NULL
GROUP BY mcc
HAVING total_transactions > 100
ORDER BY category_fraud_rate DESC, total_volume DESC`,
        columns: ['mcc', 'category_description', 'merchant_count', 'total_transactions', 'total_volume', 'avg_success_rate', 'fraud_count', 'category_fraud_rate', 'avg_daily_volume'],
        visibleColumns: ['mcc', 'category_description', 'merchant_count', 'total_transactions', 'category_fraud_rate', 'avg_success_rate'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '3.4s',
        rowCount: 18,
        queryResults: []
      },
      {
        id: 6,
        type: 'chart',
        title: 'Fraud Rate by Merchant Category',
        chartType: 'column',
        dataSource: 'query',
        xAxis: 'category_description',
        yAxis: 'category_fraud_rate',
        query: `SELECT 
  CASE 
    WHEN mcc = '5311' THEN 'Department Stores'
    WHEN mcc = '5411' THEN 'Grocery Stores'
    WHEN mcc = '5812' THEN 'Eating Places'
    WHEN mcc = '5999' THEN 'Miscellaneous Retail'
    WHEN mcc = '7372' THEN 'Computer Services'
    ELSE 'Other Categories'
  END as category_description,
  ROUND(SUM(CASE WHEN fraud = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as category_fraud_rate,
  COUNT(*) as sample_size
FROM transactions 
WHERE mcc IS NOT NULL
GROUP BY category_description
HAVING sample_size > 50
ORDER BY category_fraud_rate DESC`,
        collapsed: false,
        executed: true,
        executionTime: '2.1s'
      },
      {
        id: 7,
        type: 'data',
        title: 'Merchant Network Concentration Analysis',
        query: `SELECT 
  merchant_country,
  COUNT(DISTINCT merchant_id) as unique_merchants,
  COUNT(*) as total_transactions,
  SUM(charged_amount) as country_volume,
  AVG(merchant_success_rate) as avg_country_success_rate,
  AVG(merchant_user_diversity) as avg_user_diversity,
  SUM(CASE WHEN merchant_user_diversity < 10 THEN 1 ELSE 0 END) as low_diversity_merchants,
  COUNT(DISTINCT user_id) as unique_country_users,
  ROUND(AVG(merchant_daily_volume), 2) as avg_merchant_daily_volume
FROM transactions 
WHERE merchant_country IS NOT NULL
GROUP BY merchant_country
HAVING unique_merchants > 3
ORDER BY country_volume DESC, avg_country_success_rate ASC`,
        columns: ['merchant_country', 'unique_merchants', 'total_transactions', 'country_volume', 'avg_country_success_rate', 'avg_user_diversity', 'low_diversity_merchants', 'unique_country_users', 'avg_merchant_daily_volume'],
        visibleColumns: ['merchant_country', 'unique_merchants', 'country_volume', 'avg_country_success_rate', 'low_diversity_merchants', 'unique_country_users'],
        filters: [],
        collapsed: false,
        executed: true,
        executionTime: '3.7s',
        rowCount: 15,
        queryResults: []
      },
      {
        id: 8,
        type: 'chart',
        title: 'Geographic Merchant Performance Distribution',
        chartType: 'bubble',
        dataSource: 'query',
        xAxis: 'unique_merchants',
        yAxis: 'country_volume',
        zAxis: 'unique_country_users',
        colorBy: 'avg_country_success_rate',
        query: `SELECT 
  merchant_country,
  COUNT(DISTINCT merchant_id) as unique_merchants,
  SUM(charged_amount) as country_volume,
  COUNT(DISTINCT user_id) as unique_country_users,
  AVG(merchant_success_rate) as avg_country_success_rate
FROM transactions 
WHERE merchant_country IS NOT NULL
GROUP BY merchant_country
HAVING unique_merchants > 2`,
        collapsed: false,
        executed: true,
        executionTime: '2.5s',
        queryResults: [
          {merchant_country: 'USA', unique_merchants: 45, country_volume: 1245670.50, unique_country_users: 2340, avg_country_success_rate: 89.2},
          {merchant_country: 'BRA', unique_merchants: 23, country_volume: 567890.25, unique_country_users: 1120, avg_country_success_rate: 84.7},
          {merchant_country: 'MEX', unique_merchants: 18, country_volume: 456780.75, unique_country_users: 890, avg_country_success_rate: 87.1},
          {merchant_country: 'PAN', unique_merchants: 15, country_volume: 234560.40, unique_country_users: 567, avg_country_success_rate: 85.3},
          {merchant_country: 'COL', unique_merchants: 12, country_volume: 189430.60, unique_country_users: 445, avg_country_success_rate: 88.9}
        ]
      },
      {
        id: 9,
        type: 'ai',
        title: 'AI Merchant Risk Assessment',
        messages: [
          {
            role: 'user',
            content: 'Based on the merchant ecosystem analysis, what are the primary risk factors we should monitor? Focus on network relationships and performance indicators.',
            timestamp: '2024-01-13T14:15:00.000Z'
          },
          {
            role: 'assistant',
            content: `## Merchant Ecosystem Risk Assessment

**Critical Risk Findings:**

**1. Merchant Performance Clustering**
- 32 high-risk merchants identified with <70% success rates
- Low user diversity (<5 users) indicates potential shell merchant activity
- High daily volumes (>$25K) combined with low success rates = red flag

**2. Category-Specific Risk Patterns**
- Computer Services (MCC 7372) shows highest fraud rates
- Miscellaneous Retail (MCC 5999) concentration warrants monitoring
- Traditional categories (grocery, restaurants) show lower risk profiles

**3. Geographic Concentration Risks**
- Certain countries showing merchant ecosystem concentration
- Low-diversity merchants clustered in specific jurisdictions
- Cross-border merchant network relationships require enhanced scrutiny

**4. Network Analysis Insights**
- Shared infrastructure patterns among low-performing merchants
- User overlap across failing merchant accounts
- Timing correlations suggest coordinated merchant activities

## Key Risk Indicators

**Immediate Attention Required:**
- Merchants with <70% success rate AND <10 user diversity
- Daily volumes >$25K with fraud rates >5%
- New merchants in high-risk categories without established user base

**Enhanced Monitoring:**
- Cross-border merchant relationships
- Rapid merchant onboarding patterns
- User migration between related merchants

## Strategic Recommendations

**1. Merchant Due Diligence Enhancement**
- Implement real-time performance monitoring
- Network relationship mapping for new onboarding
- Category-specific risk scoring models

**2. Automated Risk Controls**
- Transaction limits for low-performing merchants
- Enhanced authentication for high-risk categories
- Geographic transaction restrictions based on merchant risk

**3. Ongoing Surveillance**
- Daily merchant performance dashboards
- Network change detection algorithms
- User behavior pattern analysis across merchant ecosystem

**Priority Actions:** Focus on Computer Services and Miscellaneous Retail categories for immediate risk mitigation.`,
            timestamp: '2024-01-13T14:22:00.000Z'
          }
        ],
        collapsed: false,
        executed: true,
        executionTime: '4.8s'
      },
      {
        id: 10,
        type: 'markdown',
        content: `## Merchant Ecosystem Investigation Conclusion

### Executive Summary
The merchant ecosystem analysis reveals **significant risk concentrations** requiring immediate attention and ongoing monitoring.

### Key Metrics
- **32 high-risk merchants** identified through computed risk states
- **18 merchant categories** analyzed for risk profiling  
- **15 countries** showing merchant concentration patterns
- **Critical risk factors** in Computer Services and Miscellaneous Retail

### Risk Mitigation Status
🔴 **High Priority:** Computer Services merchants (fraud rates >8%)  
🟡 **Medium Priority:** Cross-border merchant networks  
🟢 **Low Priority:** Traditional retail categories  

### Action Items
1. **Immediate:** Enhanced monitoring for identified high-risk merchants
2. **Short-term:** Implement category-specific transaction controls  
3. **Long-term:** Deploy merchant network analysis automation

---
**Investigation Status:** ONGOING MONITORING  
**Next Review:** Weekly merchant performance assessment  
**Escalation Trigger:** New merchants meeting high-risk criteria`
      }
    ]
  }
];