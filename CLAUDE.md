# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Case Tools v2.0 is a modern revenue assurance alert management platform for telecom operators, replacing legacy C/ECPG programs with a Grafana-native alert engine. The system processes telecom CDR data, detects anomalies, and provides real-time alerting with comprehensive case management.

### Technology Stack
- **Frontend**: Next.js 14 (App Router) + Ant Design 5 + TailwindCSS 4
- **Backend**: Spring Boot 3.2.1 with Java 17
- **Database**: PostgreSQL (existing schemas: casemanagement, stat, tableref, grafana)
- **Alert Engine**: Grafana 10.x with SQL-based rules
- **Real-time**: WebSocket (STOMP) for notifications
- **Authentication**: JWT with Spring Security

## Commands

### Frontend Development
```bash
cd frontend/
npm install                    # Install dependencies
npm run dev                    # Start dev server (port 3001)
npm run build                  # Production build
npm run test                   # Run Playwright E2E tests
npm run test:ui               # Interactive test runner
```

### Backend Development
```bash
cd backend/
mvn clean install             # Build and install
mvn package                   # Create WAR file
mvn spring-boot:run          # Run dev server (port 8080)
./test_backend.sh            # Run backend tests
```

### Grafana Development
```bash
# Grafana runs on port 9000 (configured in docker-compose)
docker-compose up grafana    # Start Grafana instance
```

## Architecture

### Frontend Structure
```
frontend/src/
├── app/                     # Next.js 14 App Router
│   ├── dashboard/          # Analytics dashboard with charts
│   ├── alerts/             # Alert rule management
│   ├── cases/              # Case management workflow
│   └── admin/              # User/system administration
├── components/             
│   ├── layouts/            # ProLayout, Header, Sidebar
│   ├── providers/          # WebSocket, Theme providers
│   └── ui-system/          # Ant Design-based components
├── lib/                    # API clients, utilities
└── store/                  # Zustand state management
```

### Backend Structure
```
backend/src/main/java/com/elite/casetools/
├── controller/             # REST endpoints
│   ├── AlertRuleController # Dynamic Grafana rule creation
│   ├── WebhookController   # Grafana webhook receiver
│   └── AuthController      # JWT authentication
├── service/
│   ├── GrafanaService      # Grafana API integration
│   ├── CaseService         # Case lifecycle management
│   └── WebSocketService    # Real-time notifications
└── entity/                 # JPA entities mapped to existing DB
```

## Visual Development

### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

## Key Integration Points

### Grafana Integration
- **API Base**: `http://localhost:9000/api`
- **Service Account**: Created programmatically on startup
- **Alert Rules**: Created via `/api/v1/provisioning/alert-rules`
- **Webhooks**: Received at `/api/webhook/grafana`
- **Contact Points**: Auto-configured to send to backend

### WebSocket Configuration
- **Endpoint**: `/ws` (frontend connects to `ws://localhost:8080/api/ws`)
- **STOMP Protocol**: `/topic/notifications/{userId}` for user-specific updates
- **Auto-reconnection**: Built into frontend WebSocket provider

### Database Access
- **Connection**: `jdbc:postgresql://172.29.112.1:5432/raftools2`
- **Schemas Used**:
  - `public`: User management, cases, alert rules
  - `stat`: Statistical tables (e.g., `stattraficmsc`)
  - `cdrs_archives`: CDR data (e.g., `cdrs_msc_260101`)
- **JPA Configuration**: Hibernate with schema validation

## API Structure

### Authentication
```
POST /api/auth/login         # Get JWT tokens
POST /api/auth/refresh       # Refresh access token
POST /api/auth/logout        # Invalidate tokens
```

### Alert Rules
```
GET  /api/alert-rules        # List all rules
POST /api/alert-rules        # Create Grafana rule
PUT  /api/alert-rules/{id}  # Update rule
DELETE /api/alert-rules/{id} # Delete rule
POST /api/alert-rules/test   # Test SQL query
```

### Cases
```
GET  /api/cases              # List with filtering
POST /api/cases              # Create from alert
PUT  /api/cases/{id}        # Update case
POST /api/cases/{id}/assign # Assign to user
POST /api/cases/{id}/close  # Close with resolution
```

## Development Workflows

### Creating New Alert Rules
1. Use Alert Rule Builder UI (`/alerts/builder`)
2. Visual query builder generates SQL
3. Test query against actual database
4. Deploy to Grafana via backend API
5. Webhook automatically creates cases

### Adding New Features
1. Frontend: Create page in `app/` directory
2. Add API service in `lib/api/`
3. Create backend controller/service
4. Update Grafana integration if needed
5. Add E2E tests with Playwright

### Testing Strategy
- **Frontend**: Playwright E2E tests cover critical paths
- **Backend**: Spring Boot tests with TestContainers
- **Integration**: Full flow tests from Grafana → Backend → Frontend

## Security Considerations

### JWT Configuration
- Access token: 1 hour expiry
- Refresh token: 24 hours expiry  
- Stored in httpOnly cookies
- CSRF protection enabled

### Role-Based Access
- **Admin**: Full system access
- **Manager**: Team and rule management
- **Analyst**: Case handling
- **Viewer**: Read-only access

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/ws
NEXT_PUBLIC_GRAFANA_URL=http://localhost:9000
```

### Backend (application.yml)
```
DATABASE_URL=jdbc:postgresql://172.29.112.1:5432/raftools2
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=root
GRAFANA_URL=http://localhost:9000
JWT_SECRET=[base64-encoded-secret]
```

## Important Notes

1. **Legacy System Compatibility**: Database schemas are preserved from the old system - do not modify table structures
2. **Grafana as Alert Engine**: All alert logic moved from C programs to Grafana SQL rules
3. **Real-time Priority**: WebSocket connections are critical for user experience
4. **Multi-language Support**: UI supports English, French, and Arabic (with RTL)
5. **Design System**: Follow Ant Design patterns and custom theme tokens

## Common Tasks

### Deploy New Alert Rule
```bash
# Use the UI or API to create rules that are automatically deployed to Grafana
curl -X POST http://localhost:8080/api/alert-rules \
  -H "Authorization: Bearer $TOKEN" \
  -d @rule.json
```

### Monitor WebSocket Connections
```bash
# Check active connections in Spring Boot Actuator
curl http://localhost:8080/api/actuator/metrics/websocket.sessions
```

### Database Query Examples
```sql
-- Find high-value revenue loss alerts
SELECT * FROM stat.stattraficmsc 
WHERE revenue_loss > 10000 
  AND alert_date = CURRENT_DATE;

-- Get CDR data for investigation  
SELECT * FROM cdrs_archives.cdrs_msc_260101
WHERE call_date BETWEEN '2026-01-01' AND '2026-01-04';
```