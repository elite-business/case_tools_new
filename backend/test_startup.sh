#!/bin/bash

cd "/home/taha/Elite projects/Case Managment FInal/new_case_tools/backend"

# Start the application in background
mvn spring-boot:run &
PID=$!

# Wait for the application to start (max 30 seconds)
echo "Waiting for application to start..."
for i in {1..30}; do
    if curl -s http://localhost:8080/api/actuator/health > /dev/null 2>&1; then
        echo "Application started successfully!"
        kill $PID
        exit 0
    fi
    sleep 1
done

echo "Application failed to start within 30 seconds"
kill $PID
exit 1