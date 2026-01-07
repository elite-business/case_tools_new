# CaseTools v2.0 Backend

A comprehensive Grafana case management backend system for telecom operators, providing revenue assurance alert management with real-time processing, automated case creation, and advanced reporting capabilities.

## Overview

This Spring Boot application serves as the backend for the CaseTools platform, integrating with Grafana for alert processing and providing a complete case management workflow for telecom revenue assurance teams.

### Key Features

- **Grafana Webhook Processing**: Receives and processes Grafana unified alerting webhooks
- **Automated Case Creation**: Creates cases automatically from firing alerts
- **Real-time Notifications**: WebSocket-based real-time updates and email notifications  
- **Comprehensive Case Management**: Full case lifecycle with status tracking, assignments, and SLA management
- **Advanced Reporting**: Detailed analytics and reports with export capabilities
- **Team Management**: Role-based access control and team assignment workflows
- **Audit Trail**: Complete history tracking of all case changes

## Architecture

### Core Components

#### 1. Webhook Processing (`WebhookService`)
- Validates incoming Grafana webhooks with HMAC signature verification
- Processes alerts with duplicate detection and error handling
- Creates cases automatically for firing alerts
- Handles alert resolution and case auto-resolution
- Comprehensive retry mechanism for failed processing

#### 2. Case Management (`CaseService`)
- Complete case lifecycle management (OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED)
- SLA calculation and breach detection
- Auto-assignment based on team availability
- Comment and activity tracking
- Bulk operations support

#### 3. Notification System (`NotificationService`)
- Multi-channel notifications (Email, WebSocket, Slack, Teams, SMS)
- Template-based email notifications
- Delivery tracking and retry mechanisms
- Cost tracking and analytics
- Batch notification support

#### 4. Grafana Integration (`GrafanaIntegrationService`)
- Bidirectional sync with Grafana API
- Alert rule creation and management
- Query testing and validation
- Datasource and folder management
- Health monitoring

#### 5. Reporting Engine (`ReportingService`)
- Comprehensive analytics and metrics
- Export capabilities (CSV, Excel, PDF)
- Dashboard metrics and trends
- Team performance analytics
- SLA compliance reporting

### Database Schema

#### Core Entities

**Case** (`casemanagement.case`)
- Primary case entity with full lifecycle support
- SLA tracking and breach detection
- Assignment and team management
- Metadata and custom fields

**GrafanaAlert** (`casemanagement.grafana_alert`)
- Raw Grafana alert data storage
- Processing status and error tracking
- Webhook audit trail
- Case linkage

**CaseHistory** (`casemanagement.case_history`)
- Complete audit trail of case changes
- User action tracking
- Automated vs manual change detection
- IP and session tracking for security

**Notification** (`casemanagement.notification`)
- Multi-channel notification tracking
- Delivery status and retry management
- Cost tracking and provider responses
- Template and batch management

**User & Team** (`casemanagement.users`, `casemanagement.teams`)
- Role-based access control
- Team membership and hierarchies
- Performance tracking

#### Indexes and Performance
- Optimized indexes for common query patterns
- Partitioning strategies for large datasets
- View-based metrics for reporting
- Automatic cleanup procedures

## API Endpoints

### Webhook Endpoints
```
POST   /api/webhooks/grafana/alert     # Process Grafana alerts
POST   /api/webhooks/grafana/resolved  # Handle alert resolutions
GET    /api/webhooks/health            # Health check
POST   /api/webhooks/test              # Test endpoint
```

### Case Management
```
GET    /api/cases                      # List cases with filtering
POST   /api/cases                      # Create new case
GET    /api/cases/{id}                 # Get case details
PUT    /api/cases/{id}                 # Update case
DELETE /api/cases/{id}                 # Delete case
POST   /api/cases/{id}/assign          # Assign case
POST   /api/cases/{id}/close           # Close case
POST   /api/cases/{id}/comments        # Add comment
GET    /api/cases/{id}/history         # Get case history
```

### Alert Rules
```
GET    /api/alert-rules                # List alert rules
POST   /api/alert-rules                # Create rule
PUT    /api/alert-rules/{id}           # Update rule
DELETE /api/alert-rules/{id}           # Delete rule
POST   /api/alert-rules/test           # Test rule query
POST   /api/alert-rules/sync           # Sync with Grafana
```

### Reporting
```
GET    /api/reports/cases              # Generate case report
GET    /api/reports/alerts             # Alert analytics
GET    /api/reports/notifications      # Notification report
GET    /api/reports/teams              # Team performance
GET    /api/reports/export/{type}      # Export reports
GET    /api/reports/dashboard          # Dashboard metrics
```

### Admin
```
GET    /api/admin/users                # User management
POST   /api/admin/users                # Create user
GET    /api/admin/teams                # Team management
GET    /api/admin/system/health        # System health
GET    /api/admin/system/metrics       # System metrics
```

## Configuration

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=jdbc:postgresql://localhost:5432/raftools2
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=root

# Grafana Integration
GRAFANA_URL=http://localhost:9000
GRAFANA_API_KEY=your_grafana_api_key
GRAFANA_DATASOURCE_UID=postgres-casetools
GRAFANA_FOLDER_UID=alerts
WEBHOOK_SECRET=your_webhook_secret

# JWT Security
JWT_SECRET=your_base64_encoded_secret

# Email Configuration (Optional)
MAIL_HOST=smtp.your-domain.com
MAIL_PORT=587
MAIL_USERNAME=alerts@your-domain.com
MAIL_PASSWORD=your_mail_password

# Application Settings
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
CORS_ORIGINS=http://localhost:3001,http://localhost:9000
```

### Application Configuration (`application.yml`)

Key configuration sections:

```yaml
# SLA Settings
application:
  alert:
    duplicate-window-minutes: 5
    auto-assign: true
    sla:
      critical-minutes: 15
      high-minutes: 60
      medium-minutes: 240
      low-minutes: 1440

# Notification Settings
  notification:
    email:
      enabled: true
      from: alerts@elite.com
    webhook:
      retry-attempts: 3
      retry-delay: 5000

# Case Settings
  case:
    auto-close-resolved: true
    retention-days: 365
```

## Deployment

### Development Setup

1. **Prerequisites**
   ```bash
   # Java 17+
   java -version
   
   # Maven 3.8+
   mvn -version
   
   # PostgreSQL 13+
   psql --version
   ```

2. **Database Setup**
   ```sql
   CREATE DATABASE raftools2;
   CREATE USER casetools_app WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE raftools2 TO casetools_app;
   ```

3. **Build and Run**
   ```bash
   # Clone and navigate
   cd backend/
   
   # Install dependencies
   mvn clean install
   
   # Run with dev profile
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   
   # Or build WAR for deployment
   mvn package
   ```

### Production Deployment

1. **WAR Deployment**
   ```bash
   # Build production WAR
   mvn clean package -Pprod
   
   # Deploy to application server
   cp target/casetools.war /opt/tomcat/webapps/
   ```

2. **Docker Deployment**
   ```bash
   # Build Docker image
   docker build -t casetools-backend .
   
   # Run with environment variables
   docker run -d \
     --name casetools-backend \
     -p 8080:8080 \
     -e DATABASE_URL=jdbc:postgresql://db:5432/raftools2 \
     -e GRAFANA_URL=http://grafana:9000 \
     casetools-backend
   ```

3. **Kubernetes Deployment**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: casetools-backend
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: casetools-backend
     template:
       metadata:
         labels:
           app: casetools-backend
       spec:
         containers:
         - name: casetools-backend
           image: casetools-backend:latest
           ports:
           - containerPort: 8080
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: casetools-secrets
                 key: database-url
   ```

## Monitoring

### Health Endpoints
```
GET /api/actuator/health          # Application health
GET /api/actuator/metrics         # Application metrics
GET /api/actuator/prometheus      # Prometheus metrics
```

### Key Metrics
- **Case Processing**: Creation rate, resolution time, SLA compliance
- **Alert Processing**: Webhook processing time, error rates, duplicate detection
- **Notification Delivery**: Success rates by channel, delivery times
- **System Performance**: Database connection pool, memory usage, response times

### Logging
```bash
# Application logs
tail -f logs/casetools.log

# Database query logging (dev mode)
# Set logging.level.org.hibernate.SQL=DEBUG

# WebSocket debugging
# Set logging.level.org.springframework.web.socket=DEBUG
```

## Security

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Session management with automatic cleanup
- CORS configuration for multi-origin support

### Webhook Security
- HMAC-SHA256 signature validation
- Rate limiting on webhook endpoints
- Request size limits
- IP whitelist support (configurable)

### Database Security
- Connection encryption (SSL)
- Prepared statements (SQL injection prevention)
- Row-level security for multi-tenant scenarios
- Audit logging of data access

## Testing

### Unit Tests
```bash
# Run unit tests
mvn test

# Run with coverage
mvn test jacoco:report
```

### Integration Tests
```bash
# Run integration tests
mvn verify

# Run with TestContainers
mvn test -Dtest=*IT
```

### Performance Testing
```bash
# Load testing with JMeter
jmeter -n -t test-plans/webhook-load-test.jmx

# Memory profiling
java -XX:+HeapDumpOnOutOfMemoryError -jar target/casetools.war
```

## Development Guidelines

### Code Style
- Follow Google Java Style Guide
- Use Lombok for boilerplate reduction
- Comprehensive JavaDoc for public APIs
- Unit test coverage > 80%

### Database Migrations
- Use Liquibase for schema changes
- Never modify existing migration files
- Always test migrations on production-like data

### Error Handling
- Use custom exceptions with proper HTTP status codes
- Global exception handler for consistent error responses
- Comprehensive logging with correlation IDs

## Troubleshooting

### Common Issues

**Webhook Processing Errors**
```bash
# Check webhook signature validation
grep "Invalid webhook signature" logs/casetools.log

# Verify Grafana connectivity
curl -H "Authorization: Bearer $GRAFANA_API_KEY" $GRAFANA_URL/api/health
```

**Database Connection Issues**
```bash
# Test database connectivity
psql -h localhost -U casetools_app -d raftools2 -c "SELECT 1"

# Check connection pool status
curl localhost:8080/api/actuator/metrics/hikaricp.connections
```

**Memory Issues**
```bash
# Enable heap dumps
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/

# Monitor garbage collection
-XX:+PrintGCDetails -XX:+PrintGCTimeStamps
```

### Performance Optimization

**Database Optimization**
- Regular VACUUM and ANALYZE operations
- Index monitoring and optimization
- Connection pool tuning
- Query performance analysis

**Application Optimization**
- JVM tuning for garbage collection
- Connection pool optimization
- Caching strategy implementation
- Async processing for heavy operations

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with comprehensive tests
3. Run full test suite
4. Update documentation
5. Submit pull request with detailed description

### Code Review Checklist
- [ ] Comprehensive test coverage
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact evaluated
- [ ] Database migrations tested

## Support

For technical support and questions:
- **Documentation**: [Internal Wiki](link-to-wiki)
- **Issue Tracking**: [JIRA Project](link-to-jira)
- **Team Contact**: revenue-assurance-team@elite.com

---

**Version**: 2.0.0  
**Last Updated**: January 2026  
**Team**: Elite Revenue Assurance Platform Team