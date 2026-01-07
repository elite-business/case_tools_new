# API Specification
# Case Tools v2.0 - REST & GraphQL API Documentation

## API Overview

The Case Tools API provides comprehensive endpoints for case management, webhook integration with Grafana, user management, and system configuration. The API follows RESTful principles with additional GraphQL support for complex queries.

## Base Configuration

### Base URLs
```
Production:  https://api.casetools.elite.com
Staging:     https://staging-api.casetools.elite.com
Development: http://localhost:8080/api
```

### Authentication
All API requests require JWT authentication except public endpoints.

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Common Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2025-01-02T10:30:00Z",
  "requestId": "req-123456"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2025-01-02T10:30:00Z",
  "requestId": "req-123456"
}
```

## Webhook Endpoints (Grafana Integration)

### 1. Grafana Alert Webhook

#### POST `/api/webhooks/grafana/alert`
Receives alert notifications from Grafana and creates cases automatically.

**Headers:**
```http
Content-Type: application/json
X-Grafana-Signature: <webhook_signature>
```

**Request Body:**
```json
{
  "receiver": "casetools",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCallDropRate",
        "severity": "critical",
        "msc_name": "MSC-01",
        "rule_id": "RA-001"
      },
      "annotations": {
        "summary": "Call drop rate exceeded 10% on MSC-01",
        "description": "Current drop rate: 12.5%, Threshold: 10%",
        "runbook_url": "https://wiki.elite.com/runbooks/call-drop"
      },
      "startsAt": "2025-01-02T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://grafana.elite.com/alerting/grafana/alert-1234",
      "fingerprint": "abc123def456",
      "values": {
        "drop_rate": 12.5,
        "total_calls": 10000,
        "dropped_calls": 1250
      }
    }
  ],
  "groupLabels": {
    "alertname": "HighCallDropRate"
  },
  "commonLabels": {
    "severity": "critical"
  },
  "externalURL": "https://grafana.elite.com",
  "version": "4",
  "groupKey": "{}:{alertname=\"HighCallDropRate\"}",
  "truncatedAlerts": 0
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "caseId": 1234,
        "caseNumber": "CASE-2025-0001",
        "alertFingerprint": "abc123def456",
        "status": "OPEN",
        "assignedTo": {
          "userId": 5,
          "name": "John Analyst"
        },
        "createdAt": "2025-01-02T10:00:05Z"
      }
    ],
    "processingTime": 45,
    "notificationsSent": 3
  },
  "message": "Alert processed successfully"
}
```

### 2. Grafana Resolution Webhook

#### POST `/api/webhooks/grafana/resolved`
Receives resolution notifications from Grafana to auto-close cases.

**Request Body:**
```json
{
  "receiver": "casetools",
  "status": "resolved",
  "alerts": [
    {
      "status": "resolved",
      "labels": {
        "alertname": "HighCallDropRate",
        "severity": "critical"
      },
      "endsAt": "2025-01-02T11:00:00Z",
      "fingerprint": "abc123def456"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "resolvedCases": [
      {
        "caseId": 1234,
        "caseNumber": "CASE-2025-0001",
        "resolvedAt": "2025-01-02T11:00:05Z",
        "resolutionTime": 60
      }
    ]
  }
}
```

## Case Management APIs

### 1. List Cases

#### GET `/api/cases`
Retrieve cases with advanced filtering and pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| size | integer | No | Page size (default: 20, max: 100) |
| status | string | No | Filter by status (OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED) |
| severity | string | No | Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) |
| assignedTo | integer | No | Filter by assigned user ID |
| dateFrom | datetime | No | Filter cases created after this date |
| dateTo | datetime | No | Filter cases created before this date |
| search | string | No | Search in title and description |
| sortBy | string | No | Sort field (createdAt, severity, status) |
| sortOrder | string | No | Sort order (ASC, DESC) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": 1234,
        "caseNumber": "CASE-2025-0001",
        "title": "High Call Drop Rate on MSC-01",
        "description": "Call drop rate exceeded threshold",
        "severity": "CRITICAL",
        "status": "ASSIGNED",
        "assignedTo": {
          "id": 5,
          "name": "John Analyst",
          "email": "john@elite.com"
        },
        "createdAt": "2025-01-02T10:00:00Z",
        "slaDeadline": "2025-01-02T10:15:00Z",
        "tags": ["network", "msc-01", "call-drop"]
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalPages": 10,
      "totalElements": 195
    }
  }
}
```

### 2. Get Case Details

#### GET `/api/cases/{caseId}`
Retrieve detailed information about a specific case.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "caseNumber": "CASE-2025-0001",
    "alertId": 5678,
    "grafanaAlertId": "alert-abc123",
    "title": "High Call Drop Rate on MSC-01",
    "description": "Call drop rate exceeded 10% threshold",
    "severity": "CRITICAL",
    "priority": 1,
    "category": "NETWORK_ISSUE",
    "status": "IN_PROGRESS",
    "assignedTo": {
      "id": 5,
      "name": "John Analyst",
      "email": "john@elite.com",
      "department": "Revenue Assurance"
    },
    "assignedBy": {
      "id": 1,
      "name": "System"
    },
    "assignedAt": "2025-01-02T10:00:05Z",
    "createdAt": "2025-01-02T10:00:00Z",
    "updatedAt": "2025-01-02T10:30:00Z",
    "slaDeadline": "2025-01-02T10:15:00Z",
    "slaBreached": false,
    "affectedServices": ["VOICE", "SMS"],
    "affectedCustomers": 5000,
    "estimatedLoss": 10000.00,
    "rootCause": null,
    "resolutionActions": null,
    "tags": ["network", "msc-01", "call-drop"],
    "customFields": {
      "region": "North",
      "networkElement": "MSC-01"
    },
    "relatedCases": [1230, 1231],
    "activity": [
      {
        "id": 1,
        "type": "CREATED",
        "description": "Case created from Grafana alert",
        "timestamp": "2025-01-02T10:00:00Z",
        "user": "System"
      },
      {
        "id": 2,
        "type": "ASSIGNED",
        "description": "Case assigned to John Analyst",
        "timestamp": "2025-01-02T10:00:05Z",
        "user": "System"
      }
    ],
    "comments": [
      {
        "id": 1,
        "text": "Investigating the root cause",
        "user": {
          "id": 5,
          "name": "John Analyst"
        },
        "createdAt": "2025-01-02T10:15:00Z",
        "isInternal": false
      }
    ]
  }
}
```

### 3. Create Case Manually

#### POST `/api/cases`
Create a new case manually (not from Grafana alert).

**Request Body:**
```json
{
  "title": "Manual Revenue Leakage Detection",
  "description": "Detected revenue leakage in international roaming",
  "severity": "HIGH",
  "priority": 2,
  "category": "REVENUE_LOSS",
  "assignedTo": 5,
  "affectedServices": ["ROAMING", "DATA"],
  "estimatedLoss": 25000.00,
  "tags": ["revenue", "roaming", "manual"],
  "customFields": {
    "reportedBy": "Finance Team",
    "affectedCountries": ["USA", "UK"]
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1235,
    "caseNumber": "CASE-2025-0002",
    "status": "OPEN",
    "createdAt": "2025-01-02T11:00:00Z"
  }
}
```

### 4. Update Case

#### PUT `/api/cases/{caseId}`
Update case information.

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "priority": 1,
  "rootCause": "Configuration error in billing system",
  "estimatedLoss": 30000.00,
  "tags": ["revenue", "roaming", "billing-error"]
}
```

### 5. Assign Case

#### POST `/api/cases/{caseId}/assign`
Assign or reassign a case to a user.

**Request Body:**
```json
{
  "userId": 6,
  "reason": "Expertise in billing systems required"
}
```

### 6. Add Comment

#### POST `/api/cases/{caseId}/comments`
Add a comment to a case.

**Request Body:**
```json
{
  "text": "Identified the billing configuration issue. Working on fix.",
  "isInternal": false,
  "attachments": [
    {
      "name": "billing-config.pdf",
      "url": "https://storage.elite.com/attachments/billing-config.pdf",
      "size": 1024000
    }
  ]
}
```

### 7. Close Case

#### POST `/api/cases/{caseId}/close`
Close a case with resolution details.

**Request Body:**
```json
{
  "resolutionActions": "Fixed billing configuration and reprocessed affected CDRs",
  "preventiveMeasures": "Added validation rules to prevent future occurrences",
  "actualLoss": 28500.00,
  "closureReason": "RESOLVED",
  "rootCause": "Billing system configuration error"
}
```

## User Management APIs

### 1. List Users

#### GET `/api/users`
Retrieve all users with filtering options.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | Filter by role (ADMIN, MANAGER, ANALYST, VIEWER) |
| status | string | Filter by status (ACTIVE, INACTIVE) |
| department | string | Filter by department |

### 2. Create User

#### POST `/api/users`
Create a new user account.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "login": "jane.doe",
  "email": "jane.doe@elite.com",
  "password": "SecureP@ssw0rd",
  "role": "ANALYST",
  "department": "Revenue Assurance",
  "permissions": {
    "domainControl": true,
    "revenueStream": true,
    "historiqueAlert": true,
    "raRule": false,
    "assignedTo": true
  },
  "notificationPreferences": {
    "email": true,
    "inApp": true,
    "criticalOnly": false,
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

### 3. Update User

#### PUT `/api/users/{userId}`
Update user information and permissions.

### 4. Delete User

#### DELETE `/api/users/{userId}`
Deactivate a user account (soft delete).

## Authentication APIs

### 1. Login

#### POST `/api/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "login": "john.analyst",
  "password": "SecureP@ssw0rd"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 5,
      "name": "John Analyst",
      "email": "john@elite.com",
      "role": "ANALYST",
      "permissions": {
        "domainControl": true,
        "revenueStream": true
      }
    }
  }
}
```

### 2. Refresh Token

#### POST `/api/auth/refresh`
Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### 3. Logout

#### POST `/api/auth/logout`
Invalidate current JWT token.

## Alert Rule Management APIs

### 1. List Alert Rules

#### GET `/api/alert-rules`
Retrieve all configured alert rules.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": 1,
        "ruleName": "High Call Drop Rate",
        "sqlQuery": "SELECT ... FROM stat.stattraficmsc ...",
        "threshold": 10.0,
        "severity": "CRITICAL",
        "intervalMinutes": 5,
        "active": true,
        "grafanaUid": "alert-abc123",
        "lastEvaluation": "2025-01-02T10:00:00Z",
        "evaluationCount": 288
      }
    ]
  }
}
```

### 2. Create Alert Rule

#### POST `/api/alert-rules`
Create a new alert rule and sync with Grafana.

**Request Body:**
```json
{
  "ruleName": "Revenue Loss Detection",
  "sqlQuery": "SELECT SUM(expected - actual) as loss FROM billing WHERE date = CURRENT_DATE",
  "threshold": 10000.0,
  "severity": "HIGH",
  "intervalMinutes": 30,
  "description": "Detect revenue loss above threshold",
  "notificationChannels": ["email", "webhook"]
}
```

### 3. Update Alert Rule

#### PUT `/api/alert-rules/{ruleId}`
Update an existing alert rule.

### 4. Test Alert Rule

#### POST `/api/alert-rules/{ruleId}/test`
Test an alert rule with current data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "queryResult": {
      "rows": 5,
      "columns": ["time", "value"],
      "data": [
        ["2025-01-02T10:00:00Z", 12500.00]
      ]
    },
    "wouldTrigger": true,
    "message": "Alert would trigger: value 12500.00 > threshold 10000.00"
  }
}
```

## Dashboard & Reporting APIs

### 1. Get Dashboard Metrics

#### GET `/api/dashboards/metrics`
Retrieve key metrics for dashboards.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | Time period (TODAY, WEEK, MONTH) |
| groupBy | string | Group by (HOUR, DAY, WEEK) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCases": 150,
      "openCases": 45,
      "resolvedToday": 12,
      "avgResolutionTime": 125,
      "slaCompliance": 92.5,
      "totalRevenueLoss": 125000.00
    },
    "trends": {
      "cases": [
        {"date": "2025-01-01", "count": 20},
        {"date": "2025-01-02", "count": 25}
      ],
      "revenueLoss": [
        {"date": "2025-01-01", "amount": 50000.00},
        {"date": "2025-01-02", "amount": 75000.00}
      ]
    },
    "topAlerts": [
      {
        "ruleName": "High Call Drop Rate",
        "count": 45,
        "severity": "CRITICAL"
      }
    ]
  }
}
```

### 2. Generate Report

#### POST `/api/reports/generate`
Generate a custom report.

**Request Body:**
```json
{
  "reportType": "CASE_SUMMARY",
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31",
  "format": "PDF",
  "filters": {
    "severity": ["CRITICAL", "HIGH"],
    "status": ["CLOSED"]
  },
  "groupBy": ["severity", "category"],
  "includeCharts": true
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "reportId": "rpt-123456",
    "status": "PROCESSING",
    "estimatedTime": 30,
    "downloadUrl": null
  }
}
```

### 3. Download Report

#### GET `/api/reports/{reportId}/download`
Download generated report.

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.casetools.elite.com', {
  auth: {
    token: 'JWT_TOKEN'
  }
});
```

### Events

#### Case Created
```javascript
socket.on('case:created', (data) => {
  console.log('New case:', data);
  // {
  //   caseId: 1234,
  //   caseNumber: "CASE-2025-0001",
  //   title: "...",
  //   severity: "CRITICAL"
  // }
});
```

#### Case Assigned
```javascript
socket.on('case:assigned', (data) => {
  console.log('Case assigned:', data);
});
```

#### Case Updated
```javascript
socket.on('case:updated', (data) => {
  console.log('Case updated:', data);
});
```

#### Alert Notification
```javascript
socket.on('alert:new', (data) => {
  console.log('New alert:', data);
});
```

## GraphQL Endpoints

### Endpoint
```
POST /api/graphql
```

### Schema
```graphql
type Query {
  cases(
    filter: CaseFilter
    pagination: PaginationInput
    sort: SortInput
  ): CaseConnection!
  
  case(id: ID!): Case
  
  users(filter: UserFilter): [User!]!
  
  alertRules: [AlertRule!]!
  
  dashboardMetrics(period: Period!): DashboardMetrics!
}

type Mutation {
  createCase(input: CreateCaseInput!): Case!
  updateCase(id: ID!, input: UpdateCaseInput!): Case!
  assignCase(id: ID!, userId: ID!): Case!
  closeCase(id: ID!, input: CloseCaseInput!): Case!
  addComment(caseId: ID!, text: String!): Comment!
}

type Subscription {
  caseUpdates(userId: ID): Case!
  newAlerts(severity: Severity): Alert!
}
```

### Example Query
```graphql
query GetCases {
  cases(
    filter: { 
      status: OPEN, 
      severity: CRITICAL 
    },
    pagination: { 
      page: 1, 
      size: 20 
    },
    sort: { 
      field: CREATED_AT, 
      order: DESC 
    }
  ) {
    edges {
      node {
        id
        caseNumber
        title
        severity
        assignedTo {
          name
          email
        }
      }
    }
    pageInfo {
      hasNextPage
      totalCount
    }
  }
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| Webhook | 1000 requests | 1 minute |
| Authentication | 5 requests | 1 minute |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 50 requests | 1 minute |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672650000
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| ERR_AUTHENTICATION | 401 | Invalid or missing authentication |
| ERR_AUTHORIZATION | 403 | Insufficient permissions |
| ERR_NOT_FOUND | 404 | Resource not found |
| ERR_VALIDATION | 400 | Invalid request data |
| ERR_CONFLICT | 409 | Resource conflict |
| ERR_RATE_LIMIT | 429 | Rate limit exceeded |
| ERR_INTERNAL | 500 | Internal server error |

---
*API Version: 2.0*  
*Last Updated: January 2025*