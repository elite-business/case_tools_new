# Product Requirements Document (PRD)
# Case Tools System v2.0 - Revenue Assurance Alert Management Platform

## Executive Summary

The Case Tools System v2.0 is a complete redesign of Elite's revenue assurance alert management platform for telecom operators. This system monitors CDR (Call Detail Record) data, detects anomalies, and provides real-time alerting and case management capabilities for revenue assurance teams.

## Business Context

### Company Overview
Elite specializes in telecom revenue assurance solutions, providing:
1. ETL systems that process telecom CDRs into structured databases (stored daily, e.g., `cdrs_archives.cdrs_msc_260101`)
2. Statistical analysis of CDR archives (e.g., `stat.stattraficmsc`)
3. Revenue assurance rule evaluation and alert generation

### Current System Problems
- Legacy C/ECPG programs causing system instability during bulk operations
- Poor user interface with substandard user experience
- Non-standard backend implementation lacking proper architectural patterns
- Missing real-time capabilities
- No proper case management workflow
- Manual processes for alert handling

## Product Vision

Transform the Case Tools platform into a modern, scalable, and reliable revenue assurance system using industry-standard technologies, eliminating legacy C programs in favor of Grafana-native alert rules, and providing an enterprise-grade user experience.

## Goals and Objectives

### Primary Goals
1. **Eliminate System Instability**: Replace C/ECPG programs with Grafana-native SQL alert rules
2. **Modernize Architecture**: Implement clean, maintainable architecture using Spring Boot and React/Next.js
3. **Enable Real-time Monitoring**: Provide instant alert notifications via webhooks and WebSockets
4. **Improve User Experience**: Create intuitive, responsive interfaces for both technical and business users
5. **Maintain Data Compatibility**: Keep existing PostgreSQL database schemas intact

### Success Metrics
- System uptime: 99.9% availability
- Alert processing latency: < 1 second from detection to notification
- User satisfaction: > 85% satisfaction score
- Alert accuracy: < 1% false positive rate
- Case resolution time: 50% reduction in average resolution time

## User Personas

### 1. Revenue Assurance Analyst
**Role**: Monitor and investigate revenue leakage alerts
**Needs**:
- Real-time alert notifications
- Clear alert prioritization
- Detailed investigation tools
- Case management workflow

### 2. RA Team Lead
**Role**: Manage team, oversee critical alerts, configure rules
**Needs**:
- Team performance dashboards
- Alert assignment capabilities
- Rule configuration interface
- Reporting and analytics

### 3. System Administrator
**Role**: Maintain system, manage users, configure integrations
**Needs**:
- User and group management
- System configuration tools
- Integration management
- Audit trail access

### 4. Business Stakeholder
**Role**: Review revenue impact, track KPIs
**Needs**:
- Executive dashboards
- Revenue loss reports
- Trend analysis
- Export capabilities

## Core Features

### 1. Grafana-Based Alert Engine
- **SQL-based alert rules** replacing C programs
- **Multi-condition alerts** with complex logic support
- **Threshold management** with dynamic configuration
- **Alert scheduling** with customizable intervals
- **Smart grouping** to reduce alert fatigue

### 2. Case Management System
- **Automatic case creation** from Grafana alerts
- **Assignment workflow** with skill-based routing
- **Case lifecycle tracking** (Open → Assigned → In Progress → Resolved → Closed)
- **Collaboration tools** (comments, attachments, mentions)
- **SLA monitoring** with escalation rules

### 3. Admin Portal
- **User Management**
  - User CRUD operations
  - Role-based access control (RBAC)
  - Group management
  - Permission matrix
  
- **Alert Rule Configuration**
  - Visual rule builder
  - SQL editor with syntax highlighting
  - Rule testing interface
  - Version control for rules
  
- **System Configuration**
  - Notification channels
  - Webhook endpoints
  - Email templates
  - Integration settings

### 4. Real-time Dashboards
- **Operational Dashboards**
  - Active alerts overview
  - Team workload distribution
  - SLA compliance metrics
  - System health monitoring
  
- **Business Dashboards**
  - Revenue loss tracking
  - Alert trends analysis
  - Root cause distribution
  - Recovery tracking

### 5. Notification System
- **Multi-channel Notifications**
  - Email with rich HTML templates
  - Webhook for external systems
  - In-app real-time notifications
  - SMS for critical alerts (optional)
  
- **Smart Notification Rules**
  - User preference management
  - Quiet hours configuration
  - Escalation chains
  - Digest mode for non-critical alerts

## Technical Architecture

### System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ETL System    │────►│   PostgreSQL    │◄────│    Grafana      │
│  (CDRs → Stats) │     │  (Stats/Cases)  │     │  (Alert Engine) │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                    ┌─────▼─────┐
                                                    │  Webhooks │
                                                    └─────┬─────┘
                                                          │
                        ┌─────────────────────────────────┼──────────────┐
                        ▼                                 ▼              ▼
                ┌───────────────┐            ┌───────────────┐   ┌──────────────┐
                │  Spring Boot  │            │  Admin Portal │   │ Notification │
                │  (Case Mgmt)  │◄───────────│  (React/Vue)  │   │   Services   │
                └───────────────┘            └───────────────┘   └──────────────┘
```

### Technology Stack

#### Backend
- **Framework**: Spring Boot 3.2+ with Java 17
- **Database**: PostgreSQL 14+ (existing)
- **API**: REST + GraphQL
- **Security**: Spring Security with JWT
- **Deployment**: WildFly 26 (WAR packaging)

#### Frontend
- **Framework**: Next.js 14 or Nuxt 3
- **UI Library**: Ant Design Pro or Vuetify Pro
- **State Management**: Zustand/Pinia
- **Real-time**: Socket.io client
- **Charts**: Apache ECharts

#### Monitoring & Alerting
- **Grafana**: 10.x (alert engine and dashboards)
- **Datasource**: PostgreSQL direct connection
- **Alert Channels**: Webhooks, Email, Slack

## Database Schema

### Existing Tables (Preserved)
- `stat.alerte_ra` - Historical alerts
- `stat.stattraficmsc` - Traffic statistics
- `tableref.rarules` - RA rule definitions
- `tableref.parametres_rarules` - Rule parameters
- `tableref.domaincontrol` - Domain classifications
- `tableref.revenuestream` - Revenue stream categories
- `casemanagement.userlogin` - User accounts
- `casemanagement.alert_notification` - Notifications

### New Tables
```sql
-- Case management
CREATE TABLE cases.case (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE,
    alert_id INTEGER,
    grafana_alert_id VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    severity VARCHAR(20),
    status VARCHAR(50),
    assigned_to INTEGER REFERENCES casemanagement.userlogin(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    sla_deadline TIMESTAMP
);

-- Grafana webhook logs
CREATE TABLE grafana.webhook_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    alert_name VARCHAR(255),
    payload JSONB,
    response_status VARCHAR(50),
    processing_time_ms INTEGER
);

-- Alert rule configurations
CREATE TABLE config.alert_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) UNIQUE,
    sql_query TEXT,
    threshold_value DECIMAL,
    severity VARCHAR(20),
    interval_minutes INTEGER,
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    grafana_uid VARCHAR(100)
);
```

## API Specifications

### Webhook Endpoints
```
POST /api/webhooks/grafana-alert
- Receives Grafana alert notifications
- Creates cases automatically
- Triggers assignment workflow

POST /api/webhooks/grafana-resolved
- Receives resolution notifications
- Updates case status
- Notifies assigned users
```

### Case Management APIs
```
GET    /api/cases                 - List cases with filtering
GET    /api/cases/{id}           - Get case details
POST   /api/cases                - Create case manually
PUT    /api/cases/{id}           - Update case
POST   /api/cases/{id}/assign    - Assign case
POST   /api/cases/{id}/comment   - Add comment
POST   /api/cases/{id}/close     - Close case
```

### Admin APIs
```
GET    /api/users                - List users
POST   /api/users                - Create user
PUT    /api/users/{id}           - Update user
DELETE /api/users/{id}           - Delete user
GET    /api/groups               - List groups
POST   /api/alert-rules          - Create alert rule
PUT    /api/alert-rules/{id}     - Update rule
GET    /api/audit-trail          - Get audit logs
```

## User Interface Requirements

### Design Principles
- **Responsive Design**: Support desktop, tablet, and mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Initial load < 3 seconds
- **Intuitive Navigation**: Maximum 3 clicks to any feature
- **Consistent Theme**: Enterprise blue/gray color scheme

### Key Screens

#### 1. Alert Dashboard
- Real-time alert grid with live updates
- Advanced filtering and search
- Quick actions (assign, acknowledge, close)
- Alert timeline visualization

#### 2. Case Detail View
- Complete alert information
- Investigation timeline
- Related alerts correlation
- Action buttons
- Comment thread
- Audit trail

#### 3. Rule Configuration
- Visual rule builder
- SQL editor with autocomplete
- Test execution panel
- Version comparison
- Rollback capability

#### 4. Analytics Dashboard
- Revenue loss trends
- Alert distribution charts
- Team performance metrics
- SLA compliance gauges

## Security Requirements

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Session timeout after 30 minutes of inactivity
- Password complexity requirements
- Optional 2FA for admin users

### Data Security
- Encryption at rest for sensitive data
- TLS 1.2+ for all communications
- Audit logging for all actions
- Data retention policies
- PII masking in logs

### Compliance
- GDPR compliance for user data
- Telecom regulatory compliance
- SOC 2 Type II alignment
- Regular security audits

## Performance Requirements

### System Performance
- Support 10,000 concurrent alerts
- Process webhooks < 100ms
- API response time < 500ms (95th percentile)
- Dashboard load time < 2 seconds
- Search results < 1 second

### Scalability
- Horizontal scaling capability
- Support 100 concurrent users
- Handle 1 million alerts/month
- 10TB data retention capacity

### Availability
- 99.9% uptime SLA
- Zero-downtime deployments
- Automatic failover
- Backup every 6 hours

## Integration Requirements

### Grafana Integration
- Direct PostgreSQL datasource
- Webhook configuration
- API for rule management
- SSO integration (optional)

### Email Integration
- SMTP configuration
- HTML email templates
- Attachment support
- Delivery tracking

### External Systems (Future)
- Slack/Teams notifications
- JIRA ticket creation
- ServiceNow integration
- Custom webhook receivers

## Migration Strategy

### Phase 1: Foundation (Days 1-2)
- Setup development environment
- Install and configure Grafana
- Create Spring Boot project structure
- Initialize React/Next.js frontend

### Phase 2: Core Development (Days 3-6)
- Implement webhook receivers
- Build case management backend
- Create admin portal UI
- Develop authentication system

### Phase 3: Alert Migration (Days 7-8)
- Convert C program logic to SQL
- Create Grafana alert rules
- Test with production data
- Build dashboards

### Phase 4: Testing & Deployment (Days 9-10)
- Integration testing
- Performance testing
- User acceptance testing
- Production deployment

## Success Criteria

### Functional Criteria
- All C programs successfully replaced
- Zero data loss during migration
- All existing workflows supported
- New real-time capabilities operational

### Performance Criteria
- Meet all performance requirements
- Pass load testing scenarios
- Achieve target SLA metrics

### User Acceptance
- Positive feedback from pilot users
- Successful training completion
- Smooth production rollout

## Risks and Mitigation

### Technical Risks
- **Risk**: Data migration issues
  - **Mitigation**: Maintain backward compatibility, extensive testing
  
- **Risk**: Performance degradation
  - **Mitigation**: Load testing, query optimization, caching

### Business Risks
- **Risk**: User adoption resistance
  - **Mitigation**: Comprehensive training, phased rollout
  
- **Risk**: Business continuity during migration
  - **Mitigation**: Parallel run period, rollback plan

## Future Enhancements

### Version 2.1 (3 months)
- Machine learning for anomaly detection
- Predictive alerting
- Mobile application
- Advanced analytics

### Version 3.0 (6 months)
- Multi-tenant support
- Cloud deployment option
- AI-powered root cause analysis
- Automated remediation actions

## Appendices

### A. Glossary
- **CDR**: Call Detail Record
- **RA**: Revenue Assurance
- **MSC**: Mobile Switching Center
- **SLA**: Service Level Agreement
- **RBAC**: Role-Based Access Control

### B. References
- Existing system documentation
- Grafana documentation
- Spring Boot best practices
- Telecom industry standards

---
*Document Version: 1.0*  
*Date: January 2025*  
*Status: Final*  
*Owner: Elite Engineering Team*