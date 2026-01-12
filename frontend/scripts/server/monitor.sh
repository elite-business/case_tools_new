#!/bin/bash

# Next.js Monitoring Script
# Shows real-time service status and logs

SERVICE_NAME="casetools-frontend"

echo "📊 Next.js Application Monitor"
echo "================================"
echo ""

# Check if service exists
if ! systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
    echo "❌ Service $SERVICE_NAME not found!"
    exit 1
fi

# Service status
echo "📌 Service Status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l
echo ""

# Check if running
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service is RUNNING"
    
    # Get PID
    PID=$(sudo systemctl show -p MainPID --value "$SERVICE_NAME")
    if [ "$PID" != "0" ]; then
        echo "🔢 PID: $PID"
        
        # Memory usage
        MEM=$(ps -p "$PID" -o rss= 2>/dev/null)
        if [ -n "$MEM" ]; then
            MEM_MB=$((MEM / 1024))
            echo "💾 Memory: ${MEM_MB} MB"
        fi
        
        # CPU usage
        CPU=$(ps -p "$PID" -o %cpu= 2>/dev/null)
        if [ -n "$CPU" ]; then
            echo "⚡ CPU: ${CPU}%"
        fi
    fi
else
    echo "❌ Service is NOT running"
fi

echo ""
echo "📋 Recent Logs (last 20 lines):"
echo "================================"
sudo journalctl -u "$SERVICE_NAME" -n 20 --no-pager

echo ""
echo "💡 Commands:"
echo "   - Follow logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   - Restart: sudo systemctl restart $SERVICE_NAME"
echo "   - Stop: sudo systemctl stop $SERVICE_NAME"
echo "   - Start: sudo systemctl start $SERVICE_NAME"