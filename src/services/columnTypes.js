// Column type definitions and utilities
export const COLUMN_TYPES = {
  TEXT: 'text',
  INTEGER: 'integer', 
  DECIMAL: 'decimal',
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  ID: 'id',
  CATEGORY: 'category'
};

export const TYPE_DEFINITIONS = {
  [COLUMN_TYPES.TEXT]: {
    name: 'Text',
    description: 'General text/string values',
    icon: 'Type',
    format: (value) => String(value || ''),
    sort: (a, b) => String(a).localeCompare(String(b)),
    validate: () => true
  },
  [COLUMN_TYPES.INTEGER]: {
    name: 'Integer',
    description: 'Whole numbers (e.g., counts, IDs)',
    icon: 'Hash',
    format: (value) => {
      const num = parseInt(value);
      return isNaN(num) ? '-' : num.toLocaleString();
    },
    sort: (a, b) => parseInt(a || 0) - parseInt(b || 0),
    validate: (value) => !isNaN(parseInt(value))
  },
  [COLUMN_TYPES.DECIMAL]: {
    name: 'Decimal',
    description: 'Decimal numbers with precision',
    icon: 'Hash',
    format: (value, precision = 2) => {
      const num = parseFloat(value);
      return isNaN(num) ? '-' : num.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
    },
    sort: (a, b) => parseFloat(a || 0) - parseFloat(b || 0),
    validate: (value) => !isNaN(parseFloat(value))
  },
  [COLUMN_TYPES.CURRENCY]: {
    name: 'Currency',
    description: 'Monetary amounts',
    icon: 'DollarSign',
    format: (value, currency = 'USD') => {
      const num = parseFloat(value);
      return isNaN(num) ? '-' : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(num);
    },
    sort: (a, b) => parseFloat(a || 0) - parseFloat(b || 0),
    validate: (value) => !isNaN(parseFloat(value))
  },
  [COLUMN_TYPES.PERCENTAGE]: {
    name: 'Percentage',
    description: 'Percentage values',
    icon: 'Percent',
    format: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? '-' : (num * 100).toFixed(1) + '%';
    },
    sort: (a, b) => parseFloat(a || 0) - parseFloat(b || 0),
    validate: (value) => !isNaN(parseFloat(value))
  },
  [COLUMN_TYPES.DATE]: {
    name: 'Date',
    description: 'Date values (YYYY-MM-DD)',
    icon: 'Calendar',
    format: (value) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    sort: (a, b) => new Date(a || 0).getTime() - new Date(b || 0).getTime(),
    validate: (value) => !isNaN(Date.parse(value))
  },
  [COLUMN_TYPES.DATETIME]: {
    name: 'DateTime',
    description: 'Date and time values',
    icon: 'Clock',
    format: (value) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    sort: (a, b) => new Date(a || 0).getTime() - new Date(b || 0).getTime(),
    validate: (value) => !isNaN(Date.parse(value))
  },
  [COLUMN_TYPES.BOOLEAN]: {
    name: 'Boolean',
    description: 'True/false or 1/0 values',
    icon: 'ToggleLeft',
    format: (value) => {
      if (value === '1' || value === 1 || value === true || value === 'true') {
        return '✓';
      }
      if (value === '0' || value === 0 || value === false || value === 'false') {
        return '✗';
      }
      return '-';
    },
    sort: (a, b) => {
      const aVal = (a === '1' || a === 1 || a === true || a === 'true') ? 1 : 0;
      const bVal = (b === '1' || b === 1 || b === true || b === 'true') ? 1 : 0;
      return aVal - bVal;
    },
    validate: (value) => ['0', '1', 0, 1, true, false, 'true', 'false'].includes(value)
  },
  [COLUMN_TYPES.ID]: {
    name: 'ID',
    description: 'Unique identifiers',
    icon: 'Key',
    format: (value) => {
      const str = String(value || '');
      return str.length > 20 ? str.substring(0, 8) + '...' + str.substring(str.length - 8) : str;
    },
    sort: (a, b) => String(a).localeCompare(String(b)),
    validate: () => true
  },
  [COLUMN_TYPES.CATEGORY]: {
    name: 'Category',
    description: 'Categorical/enum values',
    icon: 'Tag',
    format: (value) => String(value || ''),
    sort: (a, b) => String(a).localeCompare(String(b)),
    validate: () => true
  }
};

// Auto-detect column types from data sample
export function detectColumnTypes(data, headers) {
  const types = {};
  
  headers.forEach(column => {
    types[column] = detectSingleColumnType(data, column);
  });
  
  return types;
}

export function detectSingleColumnType(data, column) {
  if (data.length === 0) return COLUMN_TYPES.TEXT;
  
  const sample = data.slice(0, 100)
    .map(row => row[column])
    .filter(val => val !== null && val !== undefined && val !== '');
    
  if (sample.length === 0) return COLUMN_TYPES.TEXT;
  
  // Check for boolean patterns
  const booleanValues = ['0', '1', 'true', 'false', 'yes', 'no'];
  const booleanCount = sample.filter(val => 
    booleanValues.includes(String(val).toLowerCase())
  ).length;
  if (booleanCount / sample.length > 0.8) return COLUMN_TYPES.BOOLEAN;
  
  // Check for date/datetime patterns
  const dateTimeCount = sample.filter(val => {
    const parsed = Date.parse(val);
    return !isNaN(parsed) && String(val).includes(' ');
  }).length;
  if (dateTimeCount / sample.length > 0.8) return COLUMN_TYPES.DATETIME;
  
  const dateCount = sample.filter(val => {
    const parsed = Date.parse(val);
    return !isNaN(parsed) && !String(val).includes(' ');
  }).length;
  if (dateCount / sample.length > 0.8) return COLUMN_TYPES.DATE;
  
  // Check for currency patterns (contains common currency indicators)
  const currencyPatterns = /\$|USD|EUR|GBP|amount|price|cost|charged/i;
  if (currencyPatterns.test(column)) {
    const numericCount = sample.filter(val => 
      !isNaN(parseFloat(val)) && isFinite(val)
    ).length;
    if (numericCount / sample.length > 0.8) return COLUMN_TYPES.CURRENCY;
  }
  
  // Check for percentage patterns
  if (/percent|rate|ratio|pct/i.test(column)) {
    const numericCount = sample.filter(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 1;
    }).length;
    if (numericCount / sample.length > 0.8) return COLUMN_TYPES.PERCENTAGE;
  }
  
  // Check for ID patterns
  if (/id|uuid|key|hash/i.test(column)) {
    return COLUMN_TYPES.ID;
  }
  
  // Check for numeric patterns
  const integerCount = sample.filter(val => {
    const num = parseFloat(val);
    return !isNaN(num) && Number.isInteger(num);
  }).length;
  const decimalCount = sample.filter(val => {
    const num = parseFloat(val);
    return !isNaN(num) && !Number.isInteger(num);
  }).length;
  
  if (integerCount / sample.length > 0.8) return COLUMN_TYPES.INTEGER;
  if ((integerCount + decimalCount) / sample.length > 0.8) return COLUMN_TYPES.DECIMAL;
  
  // Check for category (limited unique values)
  const uniqueValues = [...new Set(sample)];
  if (uniqueValues.length <= 20 && uniqueValues.length < sample.length * 0.5) {
    return COLUMN_TYPES.CATEGORY;
  }
  
  return COLUMN_TYPES.TEXT;
}

// Format value according to its type
export function formatValue(value, type, options = {}) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  const typeDefinition = TYPE_DEFINITIONS[type] || TYPE_DEFINITIONS[COLUMN_TYPES.TEXT];
  return typeDefinition.format(value, options.precision, options.currency);
}

// Sort values according to their type
export function sortByType(values, type, ascending = true) {
  const typeDefinition = TYPE_DEFINITIONS[type] || TYPE_DEFINITIONS[COLUMN_TYPES.TEXT];
  const sorted = [...values].sort(typeDefinition.sort);
  return ascending ? sorted : sorted.reverse();
}

// Validate value for a specific type
export function validateValue(value, type) {
  const typeDefinition = TYPE_DEFINITIONS[type] || TYPE_DEFINITIONS[COLUMN_TYPES.TEXT];
  return typeDefinition.validate(value);
}

// Get default column type configuration for transaction data
export function getDefaultTransactionTypes() {
  return {
    'user_id': COLUMN_TYPES.ID,
    'txn_date_time': COLUMN_TYPES.DATETIME,
    'transaction_id': COLUMN_TYPES.ID,
    'state': COLUMN_TYPES.CATEGORY,
    'action': COLUMN_TYPES.CATEGORY,
    'type': COLUMN_TYPES.CATEGORY,
    'orig_currency': COLUMN_TYPES.CATEGORY,
    'charged_currency': COLUMN_TYPES.CATEGORY,
    'charged_amount': COLUMN_TYPES.CURRENCY,
    'decline_reason': COLUMN_TYPES.CATEGORY,
    'merchant_id': COLUMN_TYPES.ID,
    'sub_merchant_id': COLUMN_TYPES.ID,
    'terminal_id': COLUMN_TYPES.ID,
    'merchant_city': COLUMN_TYPES.TEXT,
    'mcc': COLUMN_TYPES.INTEGER,
    'merchant_country': COLUMN_TYPES.CATEGORY,
    'merchant_name': COLUMN_TYPES.TEXT,
    'three_ds': COLUMN_TYPES.BOOLEAN,
    '_wallet': COLUMN_TYPES.CATEGORY,
    'processor_code': COLUMN_TYPES.CATEGORY,
    'is_recurring': COLUMN_TYPES.BOOLEAN,
    'fraud': COLUMN_TYPES.BOOLEAN,
    'rule_1': COLUMN_TYPES.BOOLEAN,
    'rule_2': COLUMN_TYPES.BOOLEAN,
    'rule_3': COLUMN_TYPES.BOOLEAN,
    'rule_4': COLUMN_TYPES.BOOLEAN,
    'rule_5': COLUMN_TYPES.BOOLEAN,
    'decline': COLUMN_TYPES.BOOLEAN,
    'outcome': COLUMN_TYPES.CATEGORY
  };
}