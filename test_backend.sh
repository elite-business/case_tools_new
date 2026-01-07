#!/bin/bash

# Backend startup script with all required environment variables

export JWT_SECRET="TXlKV1RTZWNyZXRLZXlGb3JDYXNlVG9vbHNBcHBsaWNhdGlvbjIwMjQh"
export WEBHOOK_SECRET="webhook-secret-123"
export DATABASE_URL="jdbc:postgresql://172.29.112.1:5432/raftools2"
export DATABASE_USERNAME="postgres"
export DATABASE_PASSWORD="root"
export GRAFANA_URL="http://localhost:9000"
export GRAFANA_API_KEY="test-token"
export GRAFANA_DATASOURCE_UID="postgres-uid"
export GRAFANA_FOLDER_UID="alerts-uid"
export GRAFANA_NOTIFICATION_CHANNEL="webhook-channel"

# Navigate to backend directory
cd "/home/taha/Elite projects/Case Managment FInal/new_case_tools/backend"

echo "Starting backend with environment variables..."
mvn spring-boot:run