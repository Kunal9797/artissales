#!/bin/bash

# Artis Sales - Quick Security Test Script
# Run this to quickly verify your security fixes are working

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Artis Sales - Quick Security Test"
echo -e "==========================================${NC}\n"

# Configuration
BASE_URL="https://us-central1-artis-sales-dev.cloudfunctions.net"

# Check if tokens are provided
if [ -z "$REP_TOKEN" ] || [ -z "$MANAGER_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Auth tokens not set!${NC}\n"
    echo "Please set your auth tokens first:"
    echo ""
    echo "  export REP_TOKEN='your_rep_token_here'"
    echo "  export MANAGER_TOKEN='your_manager_token_here'"
    echo ""
    echo "To get tokens, see: security-tests/TESTING_GUIDE.md"
    echo ""
    echo -e "${BLUE}Continuing with public endpoint tests only...${NC}\n"
fi

# Test Counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ====================================================================
# TEST 1: Public Webhook (No Auth Required)
# ====================================================================
echo -e "${YELLOW}Test 1: Public Webhook${NC}"
echo "Testing basic webhook functionality..."

response=$(curl -s -w "%{http_code}" -o /tmp/test1.json \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"test","name":"Test User","phone":"9876543210","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook")

TESTS_RUN=$((TESTS_RUN + 1))
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Webhook accepts valid requests\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Webhook returned HTTP $response\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ====================================================================
# TEST 2: Input Validation - Invalid Phone
# ====================================================================
echo -e "${YELLOW}Test 2: Input Validation${NC}"
echo "Testing phone number validation..."

response=$(curl -s -w "%{http_code}" -o /tmp/test2.json \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"test","name":"Test","phone":"123","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook")

TESTS_RUN=$((TESTS_RUN + 1))
if [ "$response" == "400" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Invalid phone rejected\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Invalid phone accepted (HTTP $response)\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ====================================================================
# TEST 3: Rate Limiting (10 quick requests)
# ====================================================================
echo -e "${YELLOW}Test 3: Rate Limiting (Quick Check)${NC}"
echo "Sending 10 rapid requests to check rate limiter setup..."

success_count=0
for i in {1..10}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"source\":\"test\",\"name\":\"Test$i\",\"phone\":\"98765432$(printf %02d $i)\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
        "$BASE_URL/leadWebhook")

    if [ "$response" == "200" ]; then
        success_count=$((success_count + 1))
    elif [ "$response" == "429" ]; then
        echo -e "${GREEN}✅ PASS${NC}: Rate limiting working (triggered at request $i)\n"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
        break
    fi
    sleep 0.1
done

if [ $success_count -eq 10 ]; then
    echo -e "${YELLOW}⚠️  INFO${NC}: Rate limit not triggered in 10 requests (this is normal)\n"
    echo "   Full rate limit test (100 requests) needed for complete verification"
    echo "   Run: cd security-tests && ./test-rate-limit.sh\n"
    TESTS_RUN=$((TESTS_RUN + 1))
fi

# ====================================================================
# AUTH TESTS (Only if tokens provided)
# ====================================================================
if [ -n "$REP_TOKEN" ] && [ -n "$MANAGER_TOKEN" ]; then
    echo -e "${YELLOW}Test 4: Authorization - Rep Access${NC}"
    echo "Testing rep trying to access manager endpoint..."

    response=$(curl -s -w "%{http_code}" -o /tmp/test4.json \
        -H "Authorization: Bearer $REP_TOKEN" \
        "$BASE_URL/getTeamStats")

    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$response" == "403" ] || [ "$response" == "401" ]; then
        echo -e "${GREEN}✅ PASS${NC}: Rep blocked from manager endpoint\n"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Rep accessed manager endpoint (HTTP $response)\n"
        cat /tmp/test4.json | jq . 2>/dev/null || cat /tmp/test4.json
        echo ""
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    echo -e "${YELLOW}Test 5: Authorization - Manager Access${NC}"
    echo "Testing manager accessing manager endpoint..."

    response=$(curl -s -w "%{http_code}" -o /tmp/test5.json \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        "$BASE_URL/getTeamStats")

    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}: Manager accessed endpoint successfully\n"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Manager blocked from endpoint (HTTP $response)\n"
        cat /tmp/test5.json | jq . 2>/dev/null || cat /tmp/test5.json
        echo ""
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ====================================================================
# SUMMARY
# ====================================================================
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo -e "==========================================${NC}"
echo "Tests Run:    $TESTS_RUN"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}Tests Failed: 0${NC}"
fi

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}\n"

    if [ -z "$REP_TOKEN" ] || [ -z "$MANAGER_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Note: Authorization tests skipped (no tokens)${NC}"
        echo "   Set REP_TOKEN and MANAGER_TOKEN to test authorization\n"
    fi

    echo "Next steps:"
    echo "  1. Run full rate limit test: ./test-rate-limit.sh"
    echo "  2. Test with mobile app (different user roles)"
    echo "  3. Check Firebase logs for detailed info"
    echo ""
else
    echo -e "${RED}❌ Some tests failed!${NC}\n"
    echo "Troubleshooting:"
    echo "  1. Check Firebase function logs:"
    echo "     firebase functions:log --project artis-sales-dev"
    echo ""
    echo "  2. Verify functions deployed:"
    echo "     firebase deploy --only functions"
    echo ""
    echo "  3. Check Firestore for user roles"
    echo ""
fi

echo "For detailed testing guide, see: security-tests/TESTING_GUIDE.md"
echo ""

exit $TESTS_FAILED
