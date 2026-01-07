# Alert Rule Builder System
# Dynamic User-Defined Alert Rules Management

## Architecture Overview

Users can create alert rules through the Admin Portal, which are then automatically deployed to Grafana via API. This provides a user-friendly interface while leveraging Grafana's powerful alerting engine.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin Portal │────►│ Spring Boot  │────►│   Grafana    │────►│  PostgreSQL  │
│ Rule Builder │     │ Rule Service │     │   API        │     │   Execution  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                     │                     │                     │
       ▼                     ▼                     ▼                     ▼
  [Create Rule]      [Validate & Store]    [Deploy Rule]       [Execute Query]
```

## Database Schema for Rule Management

### Enhanced Rule Configuration Tables

```sql
-- Enhanced rule definition table
CREATE TABLE config.alert_rule_definitions (
    id SERIAL PRIMARY KEY,
    rule_uid VARCHAR(100) UNIQUE DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- REVENUE, NETWORK, QUALITY, FRAUD, CUSTOM
    
    -- Rule Configuration
    rule_type VARCHAR(50) NOT NULL, -- THRESHOLD, TREND, ANOMALY, PATTERN
    active BOOLEAN DEFAULT true,
    test_mode BOOLEAN DEFAULT false,
    
    -- Creator Information
    created_by INTEGER REFERENCES casemanagement.userlogin(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER,
    updated_at TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_rule_id INTEGER REFERENCES config.alert_rule_definitions(id),
    
    -- Grafana Integration
    grafana_uid VARCHAR(255),
    grafana_dashboard_uid VARCHAR(255),
    last_deployed TIMESTAMP,
    deployment_status VARCHAR(50), -- DRAFT, PENDING, DEPLOYED, FAILED
    deployment_error TEXT
);

-- Rule query builder configuration
CREATE TABLE config.alert_rule_queries (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES config.alert_rule_definitions(id) ON DELETE CASCADE,
    
    -- Query Builder
    table_name VARCHAR(255) NOT NULL, -- Base table for query
    time_column VARCHAR(100) DEFAULT 'created_at',
    
    -- Aggregation
    aggregation_function VARCHAR(50), -- SUM, AVG, COUNT, MIN, MAX, PERCENTILE
    aggregation_column VARCHAR(255),
    group_by_columns TEXT[], -- Array of columns to group by
    
    -- Time Window
    time_range_minutes INTEGER DEFAULT 5,
    evaluation_interval_minutes INTEGER DEFAULT 1,
    
    -- Custom SQL (for advanced users)
    custom_sql TEXT,
    use_custom_sql BOOLEAN DEFAULT false,
    
    -- Query validation
    last_validated TIMESTAMP,
    validation_status VARCHAR(50),
    sample_result JSONB
);

-- Rule conditions and thresholds
CREATE TABLE config.alert_rule_conditions (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES config.alert_rule_definitions(id) ON DELETE CASCADE,
    
    -- Condition Configuration
    condition_type VARCHAR(50), -- STATIC_THRESHOLD, DYNAMIC_THRESHOLD, PERCENTAGE_CHANGE, PATTERN
    operator VARCHAR(10), -- >, <, =, >=, <=, !=, BETWEEN, IN, NOT IN
    
    -- Threshold Values
    threshold_value DECIMAL(20,4),
    threshold_min DECIMAL(20,4), -- For BETWEEN operator
    threshold_max DECIMAL(20,4),
    threshold_percentage DECIMAL(5,2), -- For percentage-based rules
    
    -- Dynamic Thresholds
    use_dynamic_threshold BOOLEAN DEFAULT false,
    baseline_period_days INTEGER, -- Look back period for baseline
    standard_deviations DECIMAL(3,1), -- Number of std devs for anomaly
    
    -- Multi-level Thresholds
    severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
    priority INTEGER,
    
    -- Time-based Conditions
    for_duration_minutes INTEGER DEFAULT 5, -- Alert fires after X minutes
    occurrence_count INTEGER DEFAULT 1, -- Number of times condition must be met
    
    -- Business Hours
    apply_business_hours BOOLEAN DEFAULT false,
    business_hours_start TIME,
    business_hours_end TIME,
    business_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sunday, 6=Saturday
    
    UNIQUE(rule_id, severity)
);

-- Rule filters and WHERE conditions
CREATE TABLE config.alert_rule_filters (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES config.alert_rule_definitions(id) ON DELETE CASCADE,
    
    filter_column VARCHAR(255) NOT NULL,
    filter_operator VARCHAR(20), -- =, !=, >, <, LIKE, IN, NOT IN
    filter_value TEXT,
    filter_values TEXT[], -- For IN operators
    is_parameterized BOOLEAN DEFAULT false,
    parameter_name VARCHAR(100),
    
    logical_operator VARCHAR(10) DEFAULT 'AND', -- AND, OR
    filter_order INTEGER DEFAULT 0
);

-- Notification configuration per rule
CREATE TABLE config.alert_rule_notifications (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES config.alert_rule_definitions(id) ON DELETE CASCADE,
    
    -- Notification Channels
    email_enabled BOOLEAN DEFAULT true,
    email_recipients TEXT[],
    webhook_enabled BOOLEAN DEFAULT true,
    webhook_url VARCHAR(500),
    slack_enabled BOOLEAN DEFAULT false,
    slack_channel VARCHAR(100),
    
    -- Notification Rules
    notify_on_firing BOOLEAN DEFAULT true,
    notify_on_resolve BOOLEAN DEFAULT true,
    repeat_interval_minutes INTEGER DEFAULT 60,
    max_notifications_per_day INTEGER DEFAULT 24,
    
    -- Escalation
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_after_minutes INTEGER,
    escalation_recipients TEXT[],
    
    -- Templates
    email_template_id INTEGER,
    custom_message TEXT
);

-- Rule execution history
CREATE TABLE config.alert_rule_executions (
    id BIGSERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES config.alert_rule_definitions(id),
    execution_time TIMESTAMP DEFAULT NOW(),
    
    -- Execution Details
    query_executed TEXT,
    execution_duration_ms INTEGER,
    rows_returned INTEGER,
    
    -- Results
    threshold_exceeded BOOLEAN,
    actual_value DECIMAL(20,4),
    threshold_value DECIMAL(20,4),
    
    -- Alert Generation
    alert_generated BOOLEAN,
    alert_id INTEGER,
    case_id INTEGER,
    
    -- Status
    status VARCHAR(50), -- SUCCESS, FAILED, NO_DATA
    error_message TEXT
);

-- User-defined metrics catalog
CREATE TABLE config.metrics_catalog (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    category VARCHAR(50),
    
    -- Query Template
    table_name VARCHAR(255),
    column_name VARCHAR(255),
    aggregation_function VARCHAR(50),
    unit VARCHAR(50), -- PERCENTAGE, COUNT, CURRENCY, SECONDS, etc.
    
    -- Metadata
    created_by INTEGER,
    is_system_metric BOOLEAN DEFAULT false,
    tags TEXT[]
);
```

## API Endpoints for Rule Management

### 1. Create Alert Rule

#### POST `/api/alert-rules/builder`

**Request Body:**
```json
{
  "ruleName": "High International Call Rate",
  "description": "Detect unusually high international call rates",
  "category": "FRAUD",
  "ruleType": "THRESHOLD",
  
  "query": {
    "tableName": "stat.stattraficmsc",
    "aggregationFunction": "COUNT",
    "aggregationColumn": "*",
    "timeRangeMinutes": 15,
    "evaluationIntervalMinutes": 5,
    "groupBy": ["msc_name", "call_type"],
    "filters": [
      {
        "column": "call_type",
        "operator": "=",
        "value": "INTERNATIONAL"
      },
      {
        "column": "date_stat",
        "operator": "=",
        "value": "CURRENT_DATE",
        "logicalOperator": "AND"
      }
    ]
  },
  
  "conditions": [
    {
      "severity": "CRITICAL",
      "operator": ">",
      "thresholdValue": 1000,
      "forDurationMinutes": 5
    },
    {
      "severity": "HIGH",
      "operator": ">",
      "thresholdValue": 500,
      "forDurationMinutes": 10
    },
    {
      "severity": "MEDIUM",
      "operator": ">",
      "thresholdValue": 200,
      "forDurationMinutes": 15
    }
  ],
  
  "notifications": {
    "emailEnabled": true,
    "emailRecipients": ["fraud-team@elite.com"],
    "webhookEnabled": true,
    "notifyOnFiring": true,
    "notifyOnResolve": true,
    "repeatIntervalMinutes": 30
  },
  
  "schedule": {
    "enabled": true,
    "timezone": "UTC",
    "activeHours": {
      "start": "00:00",
      "end": "23:59"
    },
    "activeDays": [1, 2, 3, 4, 5, 6, 0]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ruleId": 123,
    "ruleUid": "rule-abc-123",
    "status": "DRAFT",
    "validationResult": {
      "queryValid": true,
      "estimatedExecutionTime": 250,
      "sampleData": [
        {"msc_name": "MSC-01", "count": 523}
      ]
    }
  }
}
```

### 2. Rule Builder UI Components

```typescript
// Frontend Rule Builder Component
interface RuleBuilderProps {
  onSave: (rule: AlertRule) => void;
  existingRule?: AlertRule;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ onSave, existingRule }) => {
  const [rule, setRule] = useState<AlertRule>(existingRule || defaultRule);
  
  return (
    <div className="rule-builder">
      {/* Step 1: Basic Information */}
      <RuleBasicInfo 
        rule={rule}
        onChange={(info) => setRule({...rule, ...info})}
      />
      
      {/* Step 2: Query Builder */}
      <QueryBuilder
        tables={availableTables}
        rule={rule}
        onChange={(query) => setRule({...rule, query})}
      />
      
      {/* Step 3: Conditions */}
      <ThresholdConfigurator
        rule={rule}
        onChange={(conditions) => setRule({...rule, conditions})}
      />
      
      {/* Step 4: Notifications */}
      <NotificationSettings
        rule={rule}
        onChange={(notifications) => setRule({...rule, notifications})}
      />
      
      {/* Step 5: Review and Test */}
      <RulePreview
        rule={rule}
        onTest={() => testRule(rule)}
        onSave={() => onSave(rule)}
      />
    </div>
  );
};
```

## Spring Boot Rule Service Implementation

### Rule Builder Service

```java
@Service
@Transactional
public class AlertRuleBuilderService {
    
    @Autowired
    private AlertRuleRepository ruleRepository;
    
    @Autowired
    private GrafanaApiClient grafanaClient;
    
    @Autowired
    private QueryValidationService queryValidator;
    
    public AlertRuleResponse createRule(AlertRuleRequest request, User creator) {
        // 1. Validate rule configuration
        ValidationResult validation = validateRule(request);
        if (!validation.isValid()) {
            throw new ValidationException(validation.getErrors());
        }
        
        // 2. Build SQL query from configuration
        String sqlQuery = buildSQLQuery(request);
        
        // 3. Test query execution
        QueryTestResult testResult = testQuery(sqlQuery);
        
        // 4. Save rule to database
        AlertRuleDefinition rule = saveRuleDefinition(request, creator, sqlQuery);
        
        // 5. Deploy to Grafana if not in test mode
        if (!request.isTestMode()) {
            deployToGrafana(rule, sqlQuery);
        }
        
        return AlertRuleResponse.builder()
            .ruleId(rule.getId())
            .ruleUid(rule.getRuleUid())
            .status(rule.getDeploymentStatus())
            .validationResult(testResult)
            .build();
    }
    
    private String buildSQLQuery(AlertRuleRequest request) {
        QueryBuilder qb = new QueryBuilder();
        
        // Build SELECT clause
        qb.select(
            "NOW() as time",
            buildAggregation(request.getQuery()),
            request.getQuery().getGroupBy()
        );
        
        // Build FROM clause
        qb.from(request.getQuery().getTableName());
        
        // Build WHERE clause
        for (FilterCondition filter : request.getQuery().getFilters()) {
            qb.where(filter.getColumn(), filter.getOperator(), filter.getValue());
        }
        
        // Add time range
        qb.where(request.getQuery().getTimeColumn(), ">", 
            "NOW() - INTERVAL '" + request.getQuery().getTimeRangeMinutes() + " minutes'");
        
        // Build GROUP BY clause
        if (!request.getQuery().getGroupBy().isEmpty()) {
            qb.groupBy(request.getQuery().getGroupBy());
        }
        
        // Build HAVING clause for threshold
        AlertCondition primaryCondition = request.getConditions().stream()
            .filter(c -> c.getSeverity() == Severity.CRITICAL)
            .findFirst()
            .orElse(request.getConditions().get(0));
            
        qb.having(
            buildAggregation(request.getQuery()),
            primaryCondition.getOperator(),
            primaryCondition.getThresholdValue()
        );
        
        return qb.build();
    }
    
    private void deployToGrafana(AlertRuleDefinition rule, String sqlQuery) {
        // Create Grafana alert rule via API
        GrafanaAlertRule grafanaRule = GrafanaAlertRule.builder()
            .uid(rule.getRuleUid())
            .title(rule.getRuleName())
            .condition("A")
            .data(Arrays.asList(
                GrafanaQuery.builder()
                    .refId("A")
                    .datasourceUid("postgresql-uid")
                    .rawSql(sqlQuery)
                    .format("table")
                    .build()
            ))
            .noDataState("NoData")
            .execErrState("Alerting")
            .for(rule.getConditions().get(0).getForDurationMinutes() + "m")
            .annotations(Map.of(
                "summary", rule.getDescription(),
                "rule_uid", rule.getRuleUid()
            ))
            .labels(Map.of(
                "severity", rule.getConditions().get(0).getSeverity().toString(),
                "category", rule.getCategory(),
                "user_defined", "true"
            ))
            .build();
        
        try {
            String grafanaUid = grafanaClient.createAlertRule(grafanaRule);
            rule.setGrafanaUid(grafanaUid);
            rule.setDeploymentStatus("DEPLOYED");
            rule.setLastDeployed(Instant.now());
            ruleRepository.save(rule);
        } catch (Exception e) {
            rule.setDeploymentStatus("FAILED");
            rule.setDeploymentError(e.getMessage());
            ruleRepository.save(rule);
            throw new DeploymentException("Failed to deploy rule to Grafana", e);
        }
    }
}
```

### Query Validation Service

```java
@Service
public class QueryValidationService {
    
    @Autowired
    private DataSource dataSource;
    
    public QueryTestResult testQuery(String sqlQuery) {
        // Add LIMIT for testing
        String testQuery = sqlQuery + " LIMIT 10";
        
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(testQuery)) {
            
            long startTime = System.currentTimeMillis();
            ResultSet rs = stmt.executeQuery();
            long executionTime = System.currentTimeMillis() - startTime;
            
            // Collect sample data
            List<Map<String, Object>> sampleData = new ArrayList<>();
            ResultSetMetaData metaData = rs.getMetaData();
            
            while (rs.next() && sampleData.size() < 5) {
                Map<String, Object> row = new HashMap<>();
                for (int i = 1; i <= metaData.getColumnCount(); i++) {
                    row.put(metaData.getColumnName(i), rs.getObject(i));
                }
                sampleData.add(row);
            }
            
            return QueryTestResult.builder()
                .valid(true)
                .executionTimeMs(executionTime)
                .rowCount(sampleData.size())
                .sampleData(sampleData)
                .build();
                
        } catch (SQLException e) {
            return QueryTestResult.builder()
                .valid(false)
                .error(e.getMessage())
                .build();
        }
    }
    
    public ValidationResult validateRule(AlertRuleRequest request) {
        List<String> errors = new ArrayList<>();
        
        // Validate rule name
        if (request.getRuleName() == null || request.getRuleName().isEmpty()) {
            errors.add("Rule name is required");
        }
        
        // Validate query configuration
        if (request.getQuery().getTableName() == null) {
            errors.add("Table name is required");
        }
        
        // Validate table exists and user has access
        if (!validateTableAccess(request.getQuery().getTableName())) {
            errors.add("Invalid table or insufficient permissions");
        }
        
        // Validate conditions
        if (request.getConditions().isEmpty()) {
            errors.add("At least one condition is required");
        }
        
        // Validate thresholds are logical
        validateThresholdLogic(request.getConditions(), errors);
        
        return new ValidationResult(errors.isEmpty(), errors);
    }
}
```

## Frontend Rule Builder Implementation

### Visual Query Builder Component

```tsx
// components/RuleBuilder/QueryBuilder.tsx
import React, { useState, useEffect } from 'react';
import { Select, Input, Button, Form, Card, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface QueryBuilderProps {
  tables: TableSchema[];
  onChange: (query: QueryConfig) => void;
  initialQuery?: QueryConfig;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ 
  tables, 
  onChange, 
  initialQuery 
}) => {
  const [selectedTable, setSelectedTable] = useState<string>(initialQuery?.tableName || '');
  const [columns, setColumns] = useState<ColumnSchema[]>([]);
  const [query, setQuery] = useState<QueryConfig>(initialQuery || {
    tableName: '',
    aggregationFunction: 'COUNT',
    aggregationColumn: '*',
    groupBy: [],
    filters: [],
    timeRangeMinutes: 5
  });

  // Load columns when table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable).then(setColumns);
    }
  }, [selectedTable]);

  const addFilter = () => {
    const newFilters = [...query.filters, {
      column: '',
      operator: '=',
      value: '',
      logicalOperator: 'AND'
    }];
    setQuery({ ...query, filters: newFilters });
    onChange({ ...query, filters: newFilters });
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...query.filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setQuery({ ...query, filters: newFilters });
    onChange({ ...query, filters: newFilters });
  };

  const removeFilter = (index: number) => {
    const newFilters = query.filters.filter((_, i) => i !== index);
    setQuery({ ...query, filters: newFilters });
    onChange({ ...query, filters: newFilters });
  };

  return (
    <Card title="Query Configuration" className="query-builder">
      <Form layout="vertical">
        {/* Table Selection */}
        <Form.Item label="Select Table">
          <Select
            value={selectedTable}
            onChange={(value) => {
              setSelectedTable(value);
              setQuery({ ...query, tableName: value });
              onChange({ ...query, tableName: value });
            }}
            placeholder="Choose a table"
            showSearch
          >
            {tables.map(table => (
              <Select.Option key={table.name} value={table.name}>
                <Space>
                  <span>{table.name}</span>
                  <Tag color="blue">{table.schema}</Tag>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Aggregation Configuration */}
        <Form.Item label="Metric Configuration">
          <Space>
            <Select
              value={query.aggregationFunction}
              onChange={(value) => {
                setQuery({ ...query, aggregationFunction: value });
                onChange({ ...query, aggregationFunction: value });
              }}
              style={{ width: 150 }}
            >
              <Select.Option value="COUNT">COUNT</Select.Option>
              <Select.Option value="SUM">SUM</Select.Option>
              <Select.Option value="AVG">AVERAGE</Select.Option>
              <Select.Option value="MIN">MINIMUM</Select.Option>
              <Select.Option value="MAX">MAXIMUM</Select.Option>
            </Select>
            
            <Select
              value={query.aggregationColumn}
              onChange={(value) => {
                setQuery({ ...query, aggregationColumn: value });
                onChange({ ...query, aggregationColumn: value });
              }}
              placeholder="Select column"
              style={{ width: 200 }}
            >
              <Select.Option value="*">All Records (*)</Select.Option>
              {columns.map(col => (
                <Select.Option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Form.Item>

        {/* Group By */}
        <Form.Item label="Group By">
          <Select
            mode="multiple"
            value={query.groupBy}
            onChange={(value) => {
              setQuery({ ...query, groupBy: value });
              onChange({ ...query, groupBy: value });
            }}
            placeholder="Select columns to group by"
          >
            {columns.map(col => (
              <Select.Option key={col.name} value={col.name}>
                {col.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Filters */}
        <Form.Item label="Filters">
          <Space direction="vertical" style={{ width: '100%' }}>
            {query.filters.map((filter, index) => (
              <Space key={index} style={{ width: '100%' }}>
                {index > 0 && (
                  <Select
                    value={filter.logicalOperator}
                    onChange={(value) => updateFilter(index, 'logicalOperator', value)}
                    style={{ width: 80 }}
                  >
                    <Select.Option value="AND">AND</Select.Option>
                    <Select.Option value="OR">OR</Select.Option>
                  </Select>
                )}
                
                <Select
                  value={filter.column}
                  onChange={(value) => updateFilter(index, 'column', value)}
                  placeholder="Column"
                  style={{ width: 150 }}
                >
                  {columns.map(col => (
                    <Select.Option key={col.name} value={col.name}>
                      {col.name}
                    </Select.Option>
                  ))}
                </Select>
                
                <Select
                  value={filter.operator}
                  onChange={(value) => updateFilter(index, 'operator', value)}
                  style={{ width: 100 }}
                >
                  <Select.Option value="=">=</Select.Option>
                  <Select.Option value="!=">!=</Select.Option>
                  <Select.Option value=">">></Select.Option>
                  <Select.Option value="<"><</Select.Option>
                  <Select.Option value=">=">&gt;=</Select.Option>
                  <Select.Option value="<=">&lt;=</Select.Option>
                  <Select.Option value="LIKE">LIKE</Select.Option>
                  <Select.Option value="IN">IN</Select.Option>
                </Select>
                
                <Input
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ width: 150 }}
                />
                
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => removeFilter(index)}
                  danger
                />
              </Space>
            ))}
            
            <Button 
              icon={<PlusOutlined />} 
              onClick={addFilter}
              type="dashed"
              style={{ width: '100%' }}
            >
              Add Filter
            </Button>
          </Space>
        </Form.Item>

        {/* Time Range */}
        <Form.Item label="Time Window">
          <Select
            value={query.timeRangeMinutes}
            onChange={(value) => {
              setQuery({ ...query, timeRangeMinutes: value });
              onChange({ ...query, timeRangeMinutes: value });
            }}
          >
            <Select.Option value={5}>Last 5 minutes</Select.Option>
            <Select.Option value={15}>Last 15 minutes</Select.Option>
            <Select.Option value={30}>Last 30 minutes</Select.Option>
            <Select.Option value={60}>Last 1 hour</Select.Option>
            <Select.Option value={360}>Last 6 hours</Select.Option>
            <Select.Option value={1440}>Last 24 hours</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      {/* SQL Preview */}
      <Card title="Generated SQL Preview" size="small" type="inner">
        <pre style={{ background: '#f0f2f5', padding: '10px', borderRadius: '4px' }}>
          {generateSQLPreview(query)}
        </pre>
      </Card>
    </Card>
  );
};

function generateSQLPreview(query: QueryConfig): string {
  if (!query.tableName) return '-- Select a table to begin';
  
  let sql = 'SELECT\n  NOW() as time,\n';
  
  // Add aggregation
  if (query.aggregationFunction && query.aggregationColumn) {
    sql += `  ${query.aggregationFunction}(${query.aggregationColumn}) as value`;
  }
  
  // Add group by columns
  if (query.groupBy.length > 0) {
    sql += ',\n  ' + query.groupBy.join(',\n  ');
  }
  
  sql += `\nFROM ${query.tableName}`;
  
  // Add WHERE clause
  if (query.filters.length > 0) {
    sql += '\nWHERE';
    query.filters.forEach((filter, index) => {
      if (index > 0) {
        sql += `\n  ${filter.logicalOperator}`;
      }
      sql += `\n  ${filter.column} ${filter.operator} '${filter.value}'`;
    });
  }
  
  // Add time range
  if (query.timeRangeMinutes) {
    sql += query.filters.length > 0 ? '\n  AND' : '\nWHERE';
    sql += ` created_at > NOW() - INTERVAL '${query.timeRangeMinutes} minutes'`;
  }
  
  // Add GROUP BY
  if (query.groupBy.length > 0) {
    sql += '\nGROUP BY ' + query.groupBy.join(', ');
  }
  
  return sql;
}
```

### Threshold Configuration Component

```tsx
// components/RuleBuilder/ThresholdConfigurator.tsx
import React, { useState } from 'react';
import { Card, Form, InputNumber, Select, Space, Button, Row, Col, Alert, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface ThresholdConfiguratorProps {
  onChange: (conditions: AlertCondition[]) => void;
  initialConditions?: AlertCondition[];
}

export const ThresholdConfigurator: React.FC<ThresholdConfiguratorProps> = ({
  onChange,
  initialConditions
}) => {
  const [conditions, setConditions] = useState<AlertCondition[]>(initialConditions || [
    {
      severity: 'CRITICAL',
      operator: '>',
      thresholdValue: 0,
      forDurationMinutes: 5
    }
  ]);

  const [useDynamicThreshold, setUseDynamicThreshold] = useState(false);

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
    onChange(newConditions);
  };

  const addCondition = () => {
    const newConditions = [...conditions, {
      severity: 'MEDIUM',
      operator: '>',
      thresholdValue: 0,
      forDurationMinutes: 5
    }];
    setConditions(newConditions);
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onChange(newConditions);
  };

  return (
    <Card title="Alert Conditions">
      <Form layout="vertical">
        <Form.Item label="Threshold Type">
          <Space>
            <Switch
              checked={useDynamicThreshold}
              onChange={setUseDynamicThreshold}
            />
            <span>{useDynamicThreshold ? 'Dynamic (Anomaly Detection)' : 'Static Thresholds'}</span>
          </Space>
        </Form.Item>

        {useDynamicThreshold ? (
          <Card type="inner" title="Anomaly Detection Settings">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Baseline Period (days)">
                  <InputNumber min={7} max={90} defaultValue={30} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Standard Deviations">
                  <InputNumber min={1} max={5} step={0.5} defaultValue={2} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {conditions.map((condition, index) => (
              <Card 
                key={index} 
                size="small" 
                title={`Condition ${index + 1}`}
                extra={
                  conditions.length > 1 && (
                    <Button 
                      icon={<DeleteOutlined />} 
                      onClick={() => removeCondition(index)}
                      size="small"
                      danger
                    />
                  )
                }
              >
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Severity">
                      <Select
                        value={condition.severity}
                        onChange={(value) => updateCondition(index, 'severity', value)}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="CRITICAL">
                          <span style={{ color: '#cf1322' }}>● Critical</span>
                        </Select.Option>
                        <Select.Option value="HIGH">
                          <span style={{ color: '#fa8c16' }}>● High</span>
                        </Select.Option>
                        <Select.Option value="MEDIUM">
                          <span style={{ color: '#faad14' }}>● Medium</span>
                        </Select.Option>
                        <Select.Option value="LOW">
                          <span style={{ color: '#52c41a' }}>● Low</span>
                        </Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  
                  <Col span={4}>
                    <Form.Item label="Operator">
                      <Select
                        value={condition.operator}
                        onChange={(value) => updateCondition(index, 'operator', value)}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value=">">Greater than</Select.Option>
                        <Select.Option value="<">Less than</Select.Option>
                        <Select.Option value=">=">Greater or equal</Select.Option>
                        <Select.Option value="<=">Less or equal</Select.Option>
                        <Select.Option value="=">Equal to</Select.Option>
                        <Select.Option value="!=">Not equal to</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  
                  <Col span={6}>
                    <Form.Item label="Threshold Value">
                      <InputNumber
                        value={condition.thresholdValue}
                        onChange={(value) => updateCondition(index, 'thresholdValue', value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col span={8}>
                    <Form.Item label="For Duration (minutes)">
                      <InputNumber
                        min={1}
                        max={60}
                        value={condition.forDurationMinutes}
                        onChange={(value) => updateCondition(index, 'forDurationMinutes', value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Business Hours Configuration */}
                <Form.Item label="Apply Business Hours Only">
                  <Switch
                    checked={condition.applyBusinessHours}
                    onChange={(checked) => updateCondition(index, 'applyBusinessHours', checked)}
                  />
                  {condition.applyBusinessHours && (
                    <Row gutter={16} style={{ marginTop: 10 }}>
                      <Col span={12}>
                        <Input.TimePicker
                          format="HH:mm"
                          placeholder="Start time"
                          onChange={(time, timeString) => 
                            updateCondition(index, 'businessHoursStart', timeString)
                          }
                        />
                      </Col>
                      <Col span={12}>
                        <Input.TimePicker
                          format="HH:mm"
                          placeholder="End time"
                          onChange={(time, timeString) => 
                            updateCondition(index, 'businessHoursEnd', timeString)
                          }
                        />
                      </Col>
                    </Row>
                  )}
                </Form.Item>
              </Card>
            ))}
            
            <Button 
              icon={<PlusOutlined />}
              onClick={addCondition}
              type="dashed"
              style={{ width: '100%' }}
            >
              Add Another Severity Level
            </Button>

            <Alert
              message="Tip"
              description="Define multiple severity levels to create escalation paths. Critical alerts will be prioritized."
              type="info"
              showIcon
            />
          </Space>
        )}
      </Form>
    </Card>
  );
};
```

## Grafana API Integration

### Grafana API Client

```java
@Component
public class GrafanaApiClient {
    
    @Value("${grafana.api.url}")
    private String grafanaUrl;
    
    @Value("${grafana.api.key}")
    private String apiKey;
    
    private final RestTemplate restTemplate;
    
    public GrafanaApiClient(RestTemplateBuilder builder) {
        this.restTemplate = builder
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }
    
    public String createAlertRule(GrafanaAlertRule rule) {
        String url = grafanaUrl + "/api/v1/provisioning/alert-rules";
        
        ResponseEntity<GrafanaAlertResponse> response = restTemplate.postForEntity(
            url, 
            rule, 
            GrafanaAlertResponse.class
        );
        
        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody().getUid();
        }
        
        throw new GrafanaApiException("Failed to create alert rule");
    }
    
    public void updateAlertRule(String uid, GrafanaAlertRule rule) {
        String url = grafanaUrl + "/api/v1/provisioning/alert-rules/" + uid;
        
        restTemplate.put(url, rule);
    }
    
    public void deleteAlertRule(String uid) {
        String url = grafanaUrl + "/api/v1/provisioning/alert-rules/" + uid;
        
        restTemplate.delete(url);
    }
    
    public List<GrafanaAlertRule> listAlertRules() {
        String url = grafanaUrl + "/api/v1/provisioning/alert-rules";
        
        ResponseEntity<GrafanaAlertRule[]> response = restTemplate.getForEntity(
            url,
            GrafanaAlertRule[].class
        );
        
        return Arrays.asList(response.getBody());
    }
}
```

## Rule Templates Library

```sql
-- Pre-defined rule templates for common scenarios
INSERT INTO config.metrics_catalog (metric_name, display_name, description, category, table_name, column_name, aggregation_function, unit) VALUES
('call_drop_rate', 'Call Drop Rate', 'Percentage of dropped calls', 'NETWORK', 'stat.stattraficmsc', 'dropped_calls', 'PERCENTAGE', 'PERCENTAGE'),
('revenue_per_hour', 'Hourly Revenue', 'Total revenue per hour', 'REVENUE', 'stat.stattraficmsc', 'total_revenue', 'SUM', 'CURRENCY'),
('avg_call_duration', 'Average Call Duration', 'Average duration of calls', 'QUALITY', 'stat.stattraficmsc', 'avg_duration', 'AVG', 'SECONDS'),
('fraud_spike', 'Fraud Spike Detection', 'Unusual increase in international calls', 'FRAUD', 'cdrs_archives.cdrs_msc', 'call_type', 'COUNT', 'COUNT'),
('data_usage_anomaly', 'Data Usage Anomaly', 'Abnormal data consumption', 'FRAUD', 'stat.stattraficmsc', 'data_volume_gb', 'SUM', 'GB');
```

## Benefits of User-Defined Rules

1. **No Code Changes**: Business users can create rules without developer involvement
2. **Version Control**: All rule changes are tracked with audit trail
3. **Testing**: Rules can be tested before deployment
4. **Templates**: Pre-built templates for common scenarios
5. **Grafana Integration**: Seamlessly deploys to Grafana for execution
6. **Dynamic Thresholds**: Support for both static and ML-based thresholds
7. **Business Hours**: Rules can be configured for specific time windows
8. **Multi-level Alerts**: Different severities with escalation paths

This system empowers users to create sophisticated alert rules through an intuitive UI while maintaining the power and reliability of Grafana's alerting engine.