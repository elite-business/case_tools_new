# Grafana Production Setup Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Production Configuration](#production-configuration)
- [PostgreSQL Datasource](#postgresql-datasource)
- [High Availability Setup](#high-availability-setup)
- [Security Configuration](#security-configuration)
- [Alert Rules](#alert-rules)
- [Monitoring and Backup](#monitoring-and-backup)
- [Performance Tuning](#performance-tuning)
- [Maintenance](#maintenance)

## Prerequisites

### RHEL/Rocky Linux/CentOS Stream 8/9

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y wget curl firewalld

# Ensure firewall is running
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Disable SELinux temporarily for installation
sudo setenforce 0
```

## Installation

### Method 1: YUM Repository (Recommended)

```bash
# 1. Add Grafana repository
cat > /etc/yum.repos.d/grafana.repo << 'EOF'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

# 2. Install Grafana
sudo dnf install -y grafana

# 3. Configure firewall
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload

# 4. Start and enable service
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# 5. Configure SELinux (if enabled)
sudo setsebool -P httpd_can_network_connect 1
```

### Method 2: RPM Package

```bash
# Download latest Grafana RPM
wget https://dl.grafana.com/oss/release/grafana-10.2.0-1.x86_64.rpm

# Install package
sudo dnf localinstall -y grafana-10.2.0-1.x86_64.rpm

# Enable and start
sudo systemctl enable --now grafana-server
```

## Production Configuration

### Create Production Configuration

```bash
# Backup default configuration
sudo cp /etc/grafana/grafana.ini /etc/grafana/grafana.ini.backup

# Create production configuration
sudo cat > /etc/grafana/grafana.ini << 'EOF'
##################### Grafana Production Configuration #####################

[paths]
data = /var/lib/grafana
logs = /var/log/grafana
plugins = /var/lib/grafana/plugins
provisioning = /etc/grafana/provisioning

[server]
protocol = http
http_addr = 0.0.0.0
http_port = 9000
domain = grafana.elite.com
enforce_domain = false
root_url = %(protocol)s://%(domain)s:%(http_port)s/
serve_from_sub_path = false
enable_gzip = true

[database]
type = postgres
host = localhost:5432
name = grafana
user = casetools
password = ${GRAFANA_DB_PASSWORD}
ssl_mode = require
ca_cert_path = /etc/ssl/certs/ca-certificates.crt
max_idle_conn = 25
max_open_conn = 100
conn_max_lifetime = 14400
log_queries = false

[remote_cache]
type = redis
connstr = addr=localhost:6379,pool_size=100,db=0,ssl=false

[security]
admin_user = admin
admin_password = ${GRAFANA_ADMIN_PASSWORD}
secret_key = ${GRAFANA_SECRET_KEY}
disable_gravatar = true
cookie_secure = true
cookie_samesite = lax
strict_transport_security = true
strict_transport_security_max_age_seconds = 86400
strict_transport_security_preload = false
strict_transport_security_subdomains = false
x_content_type_options = true
x_xss_protection = true
content_security_policy = true

[users]
allow_sign_up = false
allow_org_create = false
auto_assign_org = true
auto_assign_org_id = 1
auto_assign_org_role = Viewer
default_theme = light
viewers_can_edit = false

[auth]
disable_login_form = false
oauth_auto_login = false
disable_signout_menu = false
signout_redirect_url = 

[auth.ldap]
enabled = false

[auth.generic_oauth]
enabled = false

[smtp]
enabled = true
host = smtp.elite.com:587
user = alerts@elite.com
password = ${SMTP_PASSWORD}
cert_file =
key_file =
skip_verify = false
from_address = alerts@elite.com
from_name = Grafana Alerts
ehlo_identity = grafana.elite.com

[emails]
welcome_email_on_sign_up = false
templates_pattern = emails/*.html

[alerting]
enabled = true
execute_alerts = true
error_or_timeout = alerting
nodata_or_nullvalues = no_data
concurrent_render_limit = 5
evaluation_timeout = 30s
notification_timeout = 30s
max_attempts = 3

[unified_alerting]
enabled = true
ha_peers = 
ha_listen_address = 
ha_advertise_address = 
ha_reconnect_timeout = 60s
ha_gossip_interval = 200ms
ha_push_pull_interval = 60s
min_interval = 10s
evaluation_timeout = 30s
max_attempts = 3
max_annotations_to_keep = 0
max_annotations_age = 0

[log]
mode = file
level = warn
filters = 

[log.file]
level = warn
format = text
log_rotate = true
max_lines = 1000000
max_size_shift = 28
daily_rotate = true
max_days = 30

[quota]
enabled = false
org_user = 10
org_dashboard = 100
org_data_source = 10
org_api_key = 10
org_alert_rule = 100
user_org = 10
global_user = -1
global_org = -1
global_dashboard = -1
global_api_key = -1
global_session = -1
global_alert_rule = -1

[metrics]
enabled = true
interval_seconds = 10
disable_total_stats = false
basic_auth_username =
basic_auth_password =

[metrics.graphite]
address =
prefix = prod.grafana.%(instance_name)s.

[snapshots]
external_enabled = false
external_snapshot_url = 
external_snapshot_name = 
public_mode = false

[external_image_storage]
provider = local

[rendering]
server_url = 
callback_url = 
concurrent_render_request_limit = 30

[panels]
disable_sanitize_html = false

[plugins]
enable_alpha = false
app_tls_skip_verify_insecure = false

[feature_toggles]
enable = 
EOF

# Set environment variables
sudo cat > /etc/sysconfig/grafana-server << 'EOF'
GRAFANA_DB_PASSWORD=SecurePassword123!
GRAFANA_ADMIN_PASSWORD=AdminPassword456!
GRAFANA_SECRET_KEY=SW2YcwTIb9zpOOhoPsMm
SMTP_PASSWORD=SmtpPassword789!
EOF

# Secure the configuration files
sudo chmod 600 /etc/sysconfig/grafana-server
sudo chown grafana:grafana /etc/sysconfig/grafana-server
sudo chmod 640 /etc/grafana/grafana.ini
sudo chown root:grafana /etc/grafana/grafana.ini
```

## PostgreSQL Datasource

### 1. Database Setup

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database for Grafana
CREATE DATABASE grafana;

-- Create user (using same casetools user)
-- Note: If user already exists, skip this step
CREATE USER casetools WITH PASSWORD 'SecurePassword123!';

-- Grant privileges
GRANT CONNECT ON DATABASE grafana TO casetools;
GRANT ALL PRIVILEGES ON DATABASE grafana TO casetools;

-- Connect to casetools database for data access
\c casetools

-- Grant necessary permissions on schemas
GRANT USAGE ON SCHEMA stat, cdrs_archives, tableref TO casetools;
GRANT SELECT ON ALL TABLES IN SCHEMA stat TO casetools;
GRANT SELECT ON ALL TABLES IN SCHEMA cdrs_archives TO casetools;
GRANT SELECT ON ALL TABLES IN SCHEMA tableref TO casetools;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA stat GRANT SELECT ON TABLES TO casetools;
ALTER DEFAULT PRIVILEGES IN SCHEMA cdrs_archives GRANT SELECT ON TABLES TO casetools;
ALTER DEFAULT PRIVILEGES IN SCHEMA tableref GRANT SELECT ON TABLES TO casetools;

-- Create monitoring function
CREATE OR REPLACE FUNCTION stat.get_alert_metrics(
    p_start_time TIMESTAMP,
    p_end_time TIMESTAMP
) RETURNS TABLE (
    metric_time TIMESTAMP,
    metric_name VARCHAR,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('minute', created_at) as metric_time,
        alert_type as metric_name,
        COUNT(*)::NUMERIC as metric_value
    FROM stat.alerte_ra
    WHERE created_at BETWEEN p_start_time AND p_end_time
    GROUP BY date_trunc('minute', created_at), alert_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION stat.get_alert_metrics(TIMESTAMP, TIMESTAMP) TO casetools;
```

### 2. Configure Datasource Provisioning

```bash
# Create provisioning directories
sudo mkdir -p /etc/grafana/provisioning/{dashboards,datasources,alerting}
sudo chown -R grafana:grafana /etc/grafana/provisioning
```

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
      password: ${POSTGRES_PASSWORD}
    jsonData:
      sslmode: 'require'
      maxOpenConns: 100
      maxIdleConns: 10
      maxIdleConnsAuto: true
      connMaxLifetime: 14400
      postgresVersion: 1400
      timescaledb: false
    editable: false
    uid: postgres-casetools
```

## High Availability Setup

### HAProxy Load Balancer Configuration

```bash
# Install HAProxy
sudo dnf install -y haproxy

# Configure HAProxy
sudo cat > /etc/haproxy/haproxy.cfg << 'EOF'
global
    maxconn 4096
    log 127.0.0.1:514 local0
    chroot /var/lib/haproxy
    pidfile /var/run/haproxy.pid
    user haproxy
    group haproxy
    daemon
    
    # SSL configuration
    tune.ssl.default-dh-param 2048
    ssl-default-bind-ciphers ECDHE+AESGCM:ECDHE+AES256:ECDHE+AES128
    ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11
    
defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  http-server-close
    option  forwardfor except 127.0.0.0/8
    option  redispatch
    retries 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 3000
    
frontend grafana_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/grafana.pem
    redirect scheme https if !{ ssl_fc }
    
    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    http-response set-header X-Frame-Options "SAMEORIGIN"
    http-response set-header X-Content-Type-Options "nosniff"
    
    stats uri /haproxy?stats
    default_backend grafana_backend
    
backend grafana_backend
    balance roundrobin
    option httpclose
    option forwardfor
    cookie SERVERID insert indirect nocache
    
    # Health check
    option httpchk GET /api/health
    
    # Backend servers (adjust IPs as needed)
    server grafana1 10.0.1.10:9000 check cookie grafana1
    server grafana2 10.0.1.11:9000 check cookie grafana2
    server grafana3 10.0.1.12:9000 check cookie grafana3
EOF

# Enable and start HAProxy
sudo systemctl enable --now haproxy
```

### Redis Cache Setup

```bash
# Install Redis
sudo dnf install -y redis

# Configure Redis
sudo cat >> /etc/redis.conf << 'EOF'
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""
appendonly no
EOF

# Enable and start Redis
sudo systemctl enable --now redis
```

## Security Configuration

### 1. SSL/TLS Certificate Setup

```bash
# Install certbot for Let's Encrypt
sudo dnf install -y certbot

# Generate certificate
sudo certbot certonly --standalone -d grafana.elite.com \
  --non-interactive --agree-tos --email admin@elite.com

# Update Grafana configuration for HTTPS
sudo cat >> /etc/grafana/grafana.ini << 'EOF'
[server]
protocol = https
cert_file = /etc/letsencrypt/live/grafana.elite.com/fullchain.pem
cert_key = /etc/letsencrypt/live/grafana.elite.com/privkey.pem
EOF

# Set up automatic renewal
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
```

### 2. API Security

```bash
# Create API key for integration
curl -X POST https://grafana.elite.com:9000/api/auth/keys \
  -H "Content-Type: application/json" \
  -u admin:${GRAFANA_ADMIN_PASSWORD} \
  -d '{
    "name": "casetools-integration",
    "role": "Editor",
    "secondsToLive": 0
  }'

# Store the API key securely
echo "GRAFANA_API_KEY=<generated-key>" >> /etc/sysconfig/casetools
```

### 3. Firewall Rules

```bash
# Configure firewall for production
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" port port="5432" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## Alert Rules

### Production Alert Rules

Create `/etc/grafana/provisioning/alerting/production-alerts.yaml`:

```yaml
apiVersion: 1

groups:
  - name: Revenue Assurance Production
    folder: CaseTools-Production
    interval: 1m
    rules:
      - uid: high-call-drop-rate
        title: High Call Drop Rate Alert
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
                  msc_name,
                  (dropped_calls::float / total_calls * 100) as drop_rate
                FROM stat.stattraficmsc
                WHERE date_stat = CURRENT_DATE
                  AND time > NOW() - INTERVAL '5 minutes'
                  AND total_calls > 100
                  AND (dropped_calls::float / total_calls * 100) > 5
        noDataState: NoData
        execErrState: Alerting
        for: 5m
        annotations:
          description: "Call drop rate is {{ $values.drop_rate }}% for MSC {{ $values.msc_name }}"
          runbook_url: "https://wiki.elite.com/runbooks/call-drop-rate"
        labels:
          severity: critical
          team: revenue_assurance
          environment: production

      - uid: revenue-threshold-alert
        title: Revenue Drop Alert
        condition: A
        data:
          - refId: A
            queryType: ""
            relativeTimeRange:
              from: 3600
              to: 0
            datasourceUid: postgres-casetools
            model:
              expr: |
                WITH hourly_revenue AS (
                  SELECT 
                    SUM(CASE WHEN date_trunc('hour', timestamp) = date_trunc('hour', NOW()) 
                        THEN amount ELSE 0 END) as current_revenue,
                    SUM(CASE WHEN date_trunc('hour', timestamp) = date_trunc('hour', NOW() - INTERVAL '1 day')
                        THEN amount ELSE 0 END) as yesterday_revenue
                  FROM stat.revenue_data
                  WHERE timestamp > NOW() - INTERVAL '25 hours'
                )
                SELECT 
                  NOW() as time,
                  current_revenue,
                  yesterday_revenue,
                  ((yesterday_revenue - current_revenue) / yesterday_revenue * 100) as drop_percentage
                FROM hourly_revenue
                WHERE ((yesterday_revenue - current_revenue) / yesterday_revenue * 100) > 20
        noDataState: OK
        execErrState: Alerting
        for: 10m
        annotations:
          description: "Revenue dropped by {{ $values.drop_percentage }}%"
        labels:
          severity: high
          team: revenue_assurance
          environment: production
```

### Notification Channels

Create `/etc/grafana/provisioning/alerting/notifications.yaml`:

```yaml
apiVersion: 1

contactPoints:
  - uid: webhook-prod
    name: Production Webhook
    type: webhook
    settings:
      url: https://casetools.elite.com/api/webhook/grafana
      httpMethod: POST
      username: grafana
      password: ${WEBHOOK_PASSWORD}
    disableResolveMessage: false

  - uid: email-prod
    name: Production Email
    type: email
    settings:
      addresses: alerts@elite.com;oncall@elite.com
      singleEmail: false
      message: |
        Alert: {{ .GroupLabels.alertname }}
        State: {{ .Status }}
        Message: {{ .CommonAnnotations.description }}

notificationPolicies:
  - uid: default-policy
    receiver: webhook-prod
    group_by: ['alertname']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      - receiver: email-prod
        matchers:
          - severity = critical
        continue: true
```

## Monitoring and Backup

### 1. Backup Script

```bash
#!/bin/bash
# /usr/local/bin/grafana-backup.sh

BACKUP_DIR="/backup/grafana"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="s3://elite-backups/grafana"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup Grafana database
pg_dump -h localhost -U casetools grafana | gzip > ${BACKUP_DIR}/grafana_db_${DATE}.sql.gz

# Backup configuration
tar -czf ${BACKUP_DIR}/grafana_config_${DATE}.tar.gz /etc/grafana/

# Backup provisioning
tar -czf ${BACKUP_DIR}/grafana_provisioning_${DATE}.tar.gz /etc/grafana/provisioning/

# Upload to S3 (optional)
aws s3 cp ${BACKUP_DIR}/grafana_db_${DATE}.sql.gz ${S3_BUCKET}/
aws s3 cp ${BACKUP_DIR}/grafana_config_${DATE}.tar.gz ${S3_BUCKET}/
aws s3 cp ${BACKUP_DIR}/grafana_provisioning_${DATE}.tar.gz ${S3_BUCKET}/

# Keep only last 30 days of local backups
find ${BACKUP_DIR} -name "grafana_*" -mtime +30 -delete

# Log backup status
echo "$(date): Backup completed successfully" >> /var/log/grafana-backup.log
```

### 2. Monitoring Setup

```bash
# Create monitoring script
cat > /usr/local/bin/monitor-grafana.sh << 'EOF'
#!/bin/bash

# Check Grafana health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/api/health)

if [ "$HEALTH" != "200" ]; then
    echo "Grafana health check failed with status: $HEALTH"
    # Send alert
    curl -X POST https://alerts.elite.com/webhook \
      -H "Content-Type: application/json" \
      -d "{\"alert\": \"Grafana health check failed\", \"status\": \"$HEALTH\"}"
fi

# Check disk usage
DISK_USAGE=$(df -h /var/lib/grafana | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "High disk usage: $DISK_USAGE%"
fi

# Check memory usage
MEMORY_USAGE=$(free -m | awk 'NR==2 {printf "%.2f", $3/$2*100}')
echo "Memory usage: $MEMORY_USAGE%"
EOF

chmod +x /usr/local/bin/monitor-grafana.sh

# Add to crontab
echo "*/5 * * * * /usr/local/bin/monitor-grafana.sh" | crontab -
```

### 3. Log Rotation

```bash
# Configure log rotation
cat > /etc/logrotate.d/grafana << 'EOF'
/var/log/grafana/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 grafana grafana
    sharedscripts
    postrotate
        systemctl reload grafana-server
    endscript
}
EOF
```

## Performance Tuning

### 1. System Optimization

```bash
# Increase file descriptors
echo "grafana soft nofile 65535" >> /etc/security/limits.conf
echo "grafana hard nofile 65535" >> /etc/security/limits.conf

# Configure systemd limits
sudo systemctl edit grafana-server
# Add:
[Service]
LimitNOFILE=65535
TimeoutStartSec=300
Restart=on-failure
RestartSec=10s
MemoryMax=4G
MemoryHigh=3G
CPUQuota=200%
```

### 2. PostgreSQL Optimization

```sql
-- Optimize PostgreSQL for Grafana queries
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Reload configuration
SELECT pg_reload_conf();
```

### 3. Query Optimization

```ini
# Add to grafana.ini
[database]
max_idle_conn = 25
max_open_conn = 100
conn_max_lifetime = 14400
cache_mode = private

[dataproxy]
timeout = 30
keep_alive_seconds = 30

[caching]
enabled = true
ttl = 60
```

## Maintenance

### Daily Tasks
- Monitor alert evaluation performance
- Check disk space usage
- Verify webhook delivery
- Review error logs

### Weekly Tasks
- Review and optimize slow queries
- Update dashboards based on feedback
- Clean up old alert instances
- Check backup integrity

### Monthly Tasks
- Update Grafana to latest patch version
- Review and update alert rules
- Audit user access and permissions
- Performance baseline review
- Security patches

### Upgrade Procedure

```bash
# 1. Backup current installation
/usr/local/bin/grafana-backup.sh

# 2. Test upgrade in staging environment

# 3. Update Grafana
sudo dnf update grafana

# 4. Restart service
sudo systemctl restart grafana-server

# 5. Verify functionality
curl https://grafana.elite.com:9000/api/health

# 6. Check logs for errors
sudo journalctl -u grafana-server -f
```

## Quick Reference Commands

```bash
# Service management
sudo systemctl {start|stop|restart|status} grafana-server

# View logs
sudo journalctl -u grafana-server -f
sudo tail -f /var/log/grafana/grafana.log

# Configuration test
grafana-server -config /etc/grafana/grafana.ini -homepath /usr/share/grafana cfg:default

# Reset admin password
grafana-cli admin reset-admin-password NewSecurePassword123!

# Plugin management
grafana-cli plugins list-remote
grafana-cli plugins install <plugin-id>
grafana-cli plugins update-all

# Database operations
pg_dump -h localhost -U casetools grafana > backup.sql
psql -h localhost -U casetools grafana < backup.sql

# API health check
curl https://grafana.elite.com:9000/api/health

# Check alert rules
curl -H "Authorization: Bearer ${API_KEY}" \
  https://grafana.elite.com:9000/api/v1/provisioning/alert-rules

# Test webhook
curl -X POST https://casetools.elite.com/api/webhook/grafana \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check for port conflicts
sudo lsof -i :9000

# Verify configuration
grafana-server -config /etc/grafana/grafana.ini -homepath /usr/share/grafana cfg:default

# Check SELinux
sudo ausearch -m avc -ts recent
```

#### 2. Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U casetools -d grafana -c "SELECT 1"

# Check PostgreSQL logs
sudo tail -f /var/lib/pgsql/14/data/log/*.log

# Verify SSL certificates
openssl s_client -connect localhost:5432 -starttls postgres
```

#### 3. High Memory Usage
```bash
# Check current usage
ps aux | grep grafana

# Analyze memory
pmap -x $(pidof grafana-server)

# Restart with memory limits
sudo systemctl restart grafana-server
```

## Support and Resources

- Official Documentation: https://grafana.com/docs/grafana/latest/
- Enterprise Support: https://grafana.com/support/
- Alert Rules Guide: https://grafana.com/docs/grafana/latest/alerting/
- PostgreSQL Plugin: https://grafana.com/docs/grafana/latest/datasources/postgres/

---
*Document Version: 1.0*  
*Last Updated: January 2025*  
*Environment: Production*