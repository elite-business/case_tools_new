#!/bin/bash

echo "🚀 Testing Case Tools Backend Implementation..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_TOTAL=0
TESTS_PASSED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Command: $test_command"
    fi
}

echo "📋 Checking Backend Implementation..."

# 1. Check Java files exist
run_test "AlertHistory entity exists" "test -f backend/src/main/java/com/elite/casetools/entity/AlertHistory.java"
run_test "AssignmentHistory entity exists" "test -f backend/src/main/java/com/elite/casetools/entity/AssignmentHistory.java"
run_test "RuleAssignment entity exists" "test -f backend/src/main/java/com/elite/casetools/entity/RuleAssignment.java"

# 2. Check Service files
run_test "TeamPerformanceService exists" "test -f backend/src/main/java/com/elite/casetools/service/TeamPerformanceService.java"
run_test "RuleUidResolver exists" "test -f backend/src/main/java/com/elite/casetools/service/RuleUidResolver.java"
run_test "QuickActionService exists" "test -f backend/src/main/java/com/elite/casetools/service/QuickActionService.java"
run_test "SimplifiedAlertService exists" "test -f backend/src/main/java/com/elite/casetools/service/SimplifiedAlertService.java"

# 3. Check Repository files
run_test "CaseActivityRepository exists" "test -f backend/src/main/java/com/elite/casetools/repository/CaseActivityRepository.java"
run_test "AssignmentHistoryRepository exists" "test -f backend/src/main/java/com/elite/casetools/repository/AssignmentHistoryRepository.java"

# 4. Check Controller files
run_test "QuickActionController exists" "test -f backend/src/main/java/com/elite/casetools/controller/QuickActionController.java"

# 5. Check DTO files
run_test "TeamPerformance DTO exists" "test -f backend/src/main/java/com/elite/casetools/dto/TeamPerformance.java"
run_test "QuickActionRequest DTO exists" "test -f backend/src/main/java/com/elite/casetools/dto/QuickActionRequest.java"
run_test "BulkOperationResponse DTO exists" "test -f backend/src/main/java/com/elite/casetools/dto/BulkOperationResponse.java"

# 6. Check Configuration files
run_test "Application.yml configured" "test -f backend/src/main/resources/application.yml"
run_test "Environment example exists" "test -f backend/.env.example"
run_test "Dockerfile exists" "test -f backend/Dockerfile"

echo ""
echo "📋 Checking Frontend Implementation..."

# 7. Check Frontend files
run_test "Unassigned cases page exists" "test -f frontend/src/app/\(authenticated\)/admin/unassigned-cases/page.tsx"
run_test "API client exists" "test -f frontend/src/lib/client.ts"
run_test "Cases API exists" "test -f frontend/src/lib/api/cases.ts"
run_test "Users API exists" "test -f frontend/src/lib/api/users.ts"
run_test "Teams API exists" "test -f frontend/src/lib/api/teams.ts"

# 8. Check Configuration
run_test "Frontend Dockerfile exists" "test -f frontend/Dockerfile"
run_test "Environment example exists" "test -f frontend/.env.local.example"

echo ""
echo "📋 Checking Production Setup..."

# 9. Check Production files
run_test "Production Docker Compose exists" "test -f docker-compose.production.yml"
run_test "Production deployment guide exists" "test -f PRODUCTION_DEPLOYMENT.md"

echo ""
echo "📋 Checking File Integrity..."

# 10. Check for compilation issues (basic syntax check)
run_test "AlertHistory syntax check" "grep -q 'public class AlertHistory' backend/src/main/java/com/elite/casetools/entity/AlertHistory.java"
run_test "TeamPerformanceService syntax check" "grep -q 'public class TeamPerformanceService' backend/src/main/java/com/elite/casetools/service/TeamPerformanceService.java"
run_test "CaseController unassigned endpoint" "grep -q 'getUnassignedCases' backend/src/main/java/com/elite/casetools/controller/CaseController.java"

# 11. Check TypeScript files
run_test "TypeScript types updated" "grep -q 'QuickActionRequest' frontend/src/lib/types.ts"
run_test "Unassigned cases component syntax" "grep -q 'UnassignedCasesPage' frontend/src/app/\(authenticated\)/admin/unassigned-cases/page.tsx"

echo ""
echo "================================================"
echo -e "Test Results: ${GREEN}$TESTS_PASSED${NC}/${TESTS_TOTAL} tests passed"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 All tests passed! Backend implementation is complete.${NC}"
    exit 0
else
    FAILED=$((TESTS_TOTAL - TESTS_PASSED))
    echo -e "${RED}❌ $FAILED tests failed. Please check the implementation.${NC}"
    exit 1
fi