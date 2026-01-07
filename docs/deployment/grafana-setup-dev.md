# Grafana Development Setup Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [PostgreSQL Datasource](#postgresql-datasource)
- [Alert Rules Setup](#alert-rules-setup)
- [Dashboard Creation](#dashboard-creation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Ubuntu/Debian
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y software-properties-common wget curl gnupg2
```

### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Update Homebrew
brew update
```

## Installation

### Method 1: APT Repository (Ubuntu/Debian)

```bash
# 1. Add Grafana GPG key
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

# 2. Add Grafana repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# 3. Update and install
sudo apt update
sudo apt install grafana -y

# 4. Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# 5. Check status
sudo systemctl status grafana-server
```

### Method 2: Homebrew (macOS)

```bash
# Install Grafana
brew install grafana

# Start Grafana service
brew services start grafana
```

### Method 3: Docker (Recommended for Development)

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  grafana:
    image: grafana/grafana:10.2.0
    container_name: grafana-dev
    restart: unless-stopped
    ports:
      - "9000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning
    networks:
      - casetools-network

  postgres:
    image: postgres:14
    container_name: postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: casetools
      POSTGRES_USER: casetools
      POSTGRES_PASSWORD: casetools123
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - casetools-network

volumes:
  grafana-storage:
  postgres-data:

networks:
  casetools-network:
    driver: bridge
EOF

# Start services
docker-compose up -d

# View logs
docker-compose logs -f grafana
```

## Configuration

### Basic Configuration

```bash
# Edit Grafana configuration
sudo nano /etc/grafana/grafana.ini
```

Add the following development configuration:

```ini
[server]
protocol = http
http_addr = 0.0.0.0
http_port = 9000
domain = localhost
root_url = %(protocol)s://%(domain)s:%(http_port)s/

[database]
type = sqlite3
path = grafana.db

[security]
admin_user = admin
admin_password = admin123
allow_embedding = true

[alerting]
enabled = true
execute_alerts = true

[unified_alerting]
enabled = true

[unified_alerting.screenshots]
capture = true

[auth.anonymous]
enabled = true
org_name = Main Org.
org_role = Viewer

[log]
mode = console file
level = info

[webhook_notifier]
url = http://localhost:8080/api/webhook/grafana
skip_tls_verify = true
```

### Restart Grafana

```bash
# System service
sudo systemctl restart grafana-server

# Docker
docker-compose restart grafana
```

## PostgreSQL Datasource

### 1. Create Provisioning Directory

```bash
# Create directories
sudo mkdir -p /etc/grafana/provisioning/{dashboards,datasources,alerting}

# Set permissions
sudo chown -R grafana:grafana /etc/grafana/provisioning

# For Docker setup
mkdir -p ./provisioning/{dashboards,datasources,alerting}
```

### 2. Configure PostgreSQL Datasource

Create `/etc/grafana/provisioning/datasources/postgresql.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: PostgreSQL-CaseTools
    type: postgres
    access: proxy
    url: localhost:5432
    database: casetools
    user: casetools
    secureJsonData:
      password: casetools123
    jsonData:
      sslmode: 'disable'  # For development
      maxOpenConns: 100
      maxIdleConns: 10
      connMaxLifetime: 14400
      postgresVersion: 1400
    editable: true
    uid: postgres-casetools
```

### 3. Database Setup

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database if not exists
CREATE DATABASE casetools;

-- Connect to casetools database
\c casetools

-- Create schemas
CREATE SCHEMA IF NOT EXISTS stat;
CREATE SCHEMA IF NOT EXISTS cdrs_archives;
CREATE SCHEMA IF NOT EXISTS tableref;

-- Example tables for development
CREATE TABLE IF NOT EXISTS stat.alerte_ra (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100),
    severity VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS stat.stattraficmsc (
    id SERIAL PRIMARY KEY,
    msc_name VARCHAR(100),
    date_stat DATE,
    time TIMESTAMP,
    total_calls INTEGER,
    dropped_calls INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Alert Rules Setup

### 1. Create Alert Rules

Create `/etc/grafana/provisioning/alerting/alert-rules.yaml`:

```yaml
apiVersion: 1

groups:
  - name: Development Alerts
    folder: CaseTools-Dev
    interval: 1m
    rules:
      - uid: dev-test-alert
        title: Development Test Alert
        condition: A
        data:
          - refId: A
            queryType: ""
            relativeTimeRange:
              from: 600
              to: 0
            datasourceUid: postgres-casetools
            model:
              expr: |
                SELECT 
                  NOW() as time,
                  COUNT(*) as alert_count
                FROM stat.alerte_ra
                WHERE created_at > NOW() - INTERVAL '5 minutes'
              format: table
        noDataState: NoData
        execErrState: Alerting
        for: 1m
        annotations:
          description: "Test alert for development"
          summary: "{{ $values.alert_count }} alerts in last 5 minutes"
        labels:
          severity: info
          environment: development
```

### 2. Notification Channels

Create `/etc/grafana/provisioning/alerting/notification-channels.yaml`:

```yaml
apiVersion: 1

contactPoints:
  - uid: webhook-dev
    name: Development Webhook
    type: webhook
    settings:
      url: http://localhost:8080/api/webhook/grafana
      httpMethod: POST
    disableResolveMessage: false
```

## Dashboard Creation

### Sample Dashboard

Create `/etc/grafana/provisioning/dashboards/dev-dashboard.json`:

```json
{
  "dashboard": {
    "id": null,
    "uid": "dev-dashboard",
    "title": "Development Dashboard",
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "10s",
    "panels": [
      {
        "id": 1,
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "type": "stat",
        "title": "Total Alerts",
        "datasource": "PostgreSQL-CaseTools",
        "targets": [
          {
            "refId": "A",
            "rawSql": "SELECT COUNT(*) FROM stat.alerte_ra",
            "format": "table"
          }
        ]
      },
      {
        "id": 2,
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "type": "table",
        "title": "Recent Alerts",
        "datasource": "PostgreSQL-CaseTools",
        "targets": [
          {
            "refId": "A",
            "rawSql": "SELECT * FROM stat.alerte_ra ORDER BY created_at DESC LIMIT 10",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

### Dashboard Provisioning

Create `/etc/grafana/provisioning/dashboards/dashboards.yaml`:

```yaml
apiVersion: 1

providers:
  - name: 'Development Dashboards'
    orgId: 1
    folder: 'Development'
    folderUid: 'dev'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

## Testing

### 1. Access Grafana

- URL: http://localhost:9000
- Username: admin
- Password: admin123

### 2. Test Database Connection

```bash
# Test PostgreSQL connection
psql -h localhost -U casetools -d casetools -c "SELECT 1"

# Test via Grafana API
curl -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  http://localhost:9000/api/datasources/proxy/1/query \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [{
      "refId": "A",
      "rawSql": "SELECT NOW()",
      "format": "table"
    }]
  }'
```

### 3. Test Alert Rules

```bash
# Create test data
psql -U casetools -d casetools << EOF
INSERT INTO stat.alerte_ra (alert_type, severity, description)
VALUES 
  ('TEST_ALERT', 'HIGH', 'Test alert 1'),
  ('TEST_ALERT', 'MEDIUM', 'Test alert 2');
EOF

# Check alert rules via API
curl -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  http://localhost:9000/api/v1/provisioning/alert-rules
```

### 4. Test Webhook

```bash
# Simulate webhook call
curl -X POST http://localhost:8080/api/webhook/grafana \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "webhook-dev",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "Test Alert",
        "severity": "warning"
      },
      "annotations": {
        "description": "Development test alert"
      }
    }]
  }'
```

## Troubleshooting

### Common Issues

#### 1. Grafana Won't Start
```bash
# Check logs
sudo journalctl -u grafana-server -f

# For Docker
docker-compose logs grafana

# Check permissions
sudo chown -R grafana:grafana /var/lib/grafana
sudo chown -R grafana:grafana /var/log/grafana
```

#### 2. Database Connection Issues
```bash
# Test PostgreSQL connectivity
nc -zv localhost 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/*.log

# Verify pg_hba.conf allows local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host    all    all    127.0.0.1/32    md5
```

#### 3. Port Already in Use
```bash
# Find process using port 9000
sudo lsof -i :9000

# Kill process if needed
sudo kill -9 <PID>

# Or change Grafana port in grafana.ini
```

#### 4. Permission Denied Errors
```bash
# Fix file permissions
sudo chown -R grafana:grafana /etc/grafana
sudo chmod 640 /etc/grafana/grafana.ini
```

### Debug Mode

Enable debug logging for troubleshooting:

```ini
[log]
mode = console file
level = debug

[log.console]
level = debug
format = console

[log.file]
level = debug
format = text
```

## Quick Reference

```bash
# Service management
sudo systemctl {start|stop|restart|status} grafana-server

# Logs
sudo tail -f /var/log/grafana/grafana.log
sudo journalctl -u grafana-server -f

# Docker commands
docker-compose up -d        # Start
docker-compose down         # Stop
docker-compose logs -f      # View logs
docker-compose restart      # Restart

# Reset admin password
grafana-cli admin reset-admin-password newpassword

# API health check
curl http://localhost:9000/api/health
```

## Resources

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [PostgreSQL Plugin](https://grafana.com/docs/grafana/latest/datasources/postgres/)
- [Alert Rules Guide](https://grafana.com/docs/grafana/latest/alerting/alerting-rules/)
- [Dashboard JSON Model](https://grafana.com/docs/grafana/latest/dashboards/json-model/)

---
*Document Version: 1.0*  
*Last Updated: January 2025*  
*Environment: Development*