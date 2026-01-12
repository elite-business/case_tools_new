#!/bin/bash

# Next.js Deployment Script
# Usage: ./deploy.sh /path/to/deployment-YYYY-MM-DD.tar.gz

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="/opt/casetools/frontend"
BACKUP_DIR="/opt/casetools/backups"
SERVICE_NAME="casetools-frontend"
MAX_BACKUPS=5

# Check if archive file is provided
if [ -z "$1" ]; then
    echo "❌ Error: No deployment archive specified"
    echo "Usage: $0 /path/to/deployment-YYYY-MM-DD.tar.gz"
    exit 1
fi

ARCHIVE_PATH="$1"

# Check if archive exists
if [ ! -f "$ARCHIVE_PATH" ]; then
    echo "❌ Error: Archive file not found: $ARCHIVE_PATH"
    exit 1
fi

echo "📦 Archive: $ARCHIVE_PATH"

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$APP_DIR"

# Stop the service
echo "⏸️  Stopping service..."
sudo systemctl stop "$SERVICE_NAME" || echo "⚠️  Service not running"

# Backup current deployment
if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
    echo "💾 Creating backup..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    cd "$(dirname "$APP_DIR")"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" "$(basename "$APP_DIR")" 2>/dev/null || true
    echo "✅ Backup saved: $BACKUP_DIR/$BACKUP_NAME"
fi

# Extract new deployment
echo "📦 Extracting new deployment..."
cd "$APP_DIR"

# Preserve .env.production if it exists
if [ -f ".env.production" ]; then
    echo "💾 Preserving .env.production..."
    cp .env.production /tmp/.env.production.backup
fi

# Remove old files
echo "🧹 Cleaning old deployment..."
find . -mindepth 1 ! -name '.env.production' -delete

# Extract new archive
echo "📂 Extracting archive..."
tar -xzf "$ARCHIVE_PATH"

# Restore .env.production if it was backed up
if [ -f "/tmp/.env.production.backup" ]; then
    echo "♻️  Restoring .env.production..."
    mv /tmp/.env.production.backup .env.production
fi

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R $(whoami):$(whoami) "$APP_DIR"
chmod +x start.sh 2>/dev/null || true

# Verify deployment
echo "🔍 Verifying deployment..."
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found! Deployment may be corrupted."
    exit 1
fi

# Start the service
echo "▶️  Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 3

# Check status
echo "🔍 Checking service status..."
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service is running"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
    echo "❌ Service failed to start!"
    echo "📋 Last 20 log lines:"
    sudo journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi

# Clean old backups (keep only last N backups)
echo "🧹 Cleaning old backups (keeping last $MAX_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t backup-*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
BACKUP_COUNT=$(ls -1 backup-*.tar.gz 2>/dev/null | wc -l)
echo "📊 Backups remaining: $BACKUP_COUNT"

echo ""
echo "✅ Deployment complete!"
echo "📊 Current status:"
echo "   - Service: $SERVICE_NAME"
echo "   - Directory: $APP_DIR"
echo "   - Latest backup: $BACKUP_DIR/$BACKUP_NAME"
echo ""
echo "💡 Useful commands:"
echo "   - View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   - Restart: sudo systemctl restart $SERVICE_NAME"
echo "   - Status: sudo systemctl status $SERVICE_NAME"
echo ""
echo "🎉 Done!"