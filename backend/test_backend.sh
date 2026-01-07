#!/bin/bash

echo "=== Backend Health Check ==="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BASE_URL="http://localhost:8080/api"

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    
    echo -n "Testing $method $endpoint... "
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✓ OK (HTTP $response)${NC}"
    elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${YELLOW}⚠ Protected (HTTP $response)${NC}"
    elif [ "$response" = "503" ]; then
        echo -e "${YELLOW}⚠ Service Unavailable (HTTP $response)${NC}"
    elif [ "$response" = "000" ]; then
        echo -e "${RED}✗ Server not reachable${NC}"
    else
        echo -e "${RED}✗ Failed (HTTP $response)${NC}"
    fi
}

# Check if server is running
echo "1. Checking if server is running on port 8080..."
if lsof -i :8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 8080${NC}"
else
    echo -e "${RED}✗ Server is NOT running on port 8080${NC}"
    echo ""
    echo "Start the server with:"
    echo "  cd /home/taha/Elite\\ projects/Case\\ Managment\\ FInal/new_case_tools/backend"
    echo "  mvn spring-boot:run"
    exit 1
fi

echo ""
echo "2. Testing endpoints..."
check_endpoint "/actuator/health"
check_endpoint "/health"
check_endpoint "/test"
check_endpoint "/swagger-ui.html"
check_endpoint "/auth/login" "POST" '{"username":"admin","password":"admin123"}'
check_endpoint "/users"
check_endpoint "/alerts"

echo ""
echo "3. Checking database connection..."
if grep -q "HikariPool.*Added connection" app.log 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify database connection from logs${NC}"
fi

echo ""
echo "4. API Documentation:"
echo "   Swagger UI: http://localhost:8080/api/swagger-ui.html"
echo "   API Docs:   http://localhost:8080/api/v3/api-docs"

echo ""
echo "=== Health Check Complete ===">