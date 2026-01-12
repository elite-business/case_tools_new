#!/bin/bash

# Next.js Rollback Script
# Usage: ./rollback.sh [backup-file]

set -e

echo "🔄 Starting rollback..."

# Configuration
APP_DIR="/opt/casetools/frontend"
BACKUP_DIR="/opt/casetools/backups"
SERVICE_NAME="casetools-frontend"

# If no backup specified, use the latest
if [ -z "$1" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "❌ Error: No backups found in $BACKUP_DIR"
        exit 1
    fi
    echo "📦 Using latest backup: $BACKUP_FILE"
else
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Confirm rollback
echo "⚠️  WARNING: This will replace the current deployment!"
echo "📦 Rollback to: $BACKUP_FILE"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

# Stop service
echo "⏸️  Stopping service..."
sudo systemctl stop "$SERVICE_NAME"

# Create backup of current state before rollback
echo "💾 Creating pre-rollback backup..."
PREROLLBACK_BACKUP="$BACKUP_DIR/pre-rollback-$(date +%Y%m%d-%H%M%S).tar.gz"
cd "$(dirname "$APP_DIR")"
tar -czf "$PREROLLBACK_BACKUP" "$(basename "$APP_DIR")" 2>/dev/null || true

# Preserve .env.production
if [ -f "$APP_DIR/.env.production" ]; then
    echo "💾 Preserving .env.production..."
    cp "$APP_DIR/.env.production" /tmp/.env.production.backup
fi

# Remove current deployment
echo "🧹 Removing current deployment..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

# Extract backup
echo "📦 Restoring from backup..."
cd "$(dirname "$APP_DIR")"
tar -xzf "$BACKUP_FILE"

# Restore .env.production
if [ -f "/tmp/.env.production.backup" ]; then
    echo "♻️  Restoring .env.production..."
    cp /tmp/.env.production.backup "$APP_DIR/.env.production"
    rm /tmp/.env.production.backup
fi

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $(whoami):$(whoami) "$APP_DIR"

# Start service
echo "▶️  Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Wait and check status
sleep 3
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Rollback successful!"
    sudo systemctl status "$SERVICE_NAME" --no-pager
else
    echo "❌ Service failed to start after rollback!"
    sudo journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi

echo ""
echo "🎉 Rollback complete!"
echo "📊 Pre-rollback backup saved: $PREROLLBACK_BACKUP"