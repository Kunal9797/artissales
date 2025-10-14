#!/bin/bash

# Artis Sales App - Comprehensive Security & Vulnerability Testing Suite
# This script tests authentication, authorization, input validation, and API security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL - Update this to your Cloud Functions URL
BASE_URL="https://us-central1-artis-sales-dev.cloudfunctions.net"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    local test_name=$1
    local expected=$2
    local actual=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "  Expected: $expected"
        echo -e "  Got: $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to make authenticated request
auth_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4

    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "$BASE_URL/$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL/$endpoint"
    fi
}

echo "=========================================="
echo "Artis Sales App - Security Test Suite"
echo "=========================================="
echo ""

# ==============================================================================
# TEST 1: Authentication Tests
# ==============================================================================
echo -e "${YELLOW}1. AUTHENTICATION TESTS${NC}"
echo "----------------------------------------"

# Test 1.1: Missing Authorization Header
echo "Test 1.1: API rejects requests without auth token"
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    -H "Content-Type: application/json" \
    -d '{"userId":"test123"}' \
    "$BASE_URL/logVisit")
print_result "Reject request without auth token" "401" "$response"

# Test 1.2: Invalid Authorization Header Format
echo "Test 1.2: API rejects malformed auth header"
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    -H "Authorization: InvalidFormat abc123" \
    -H "Content-Type: application/json" \
    -d '{"userId":"test123"}' \
    "$BASE_URL/logVisit")
print_result "Reject malformed auth header" "401" "$response"

# Test 1.3: Invalid/Expired Token
echo "Test 1.3: API rejects expired/invalid token"
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
    -H "Content-Type: application/json" \
    -d '{"userId":"test123"}' \
    "$BASE_URL/logVisit")
print_result "Reject invalid JWT token" "401" "$response"

echo ""

# ==============================================================================
# TEST 2: Input Validation Tests
# ==============================================================================
echo -e "${YELLOW}2. INPUT VALIDATION TESTS${NC}"
echo "----------------------------------------"

# Test 2.1: SQL Injection Attempts (Firestore doesn't use SQL but test sanitization)
echo "Test 2.1: SQL injection in phone field"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"John","phone":"9876543210; DROP TABLE users;--","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook" | jq -r '.ok')
print_result "Sanitize SQL injection attempt" "false" "$response"

# Test 2.2: XSS Attempts in Name Field
echo "Test 2.2: XSS attempt in name field"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"<script>alert(\"XSS\")</script>","phone":"9876543210","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook")
# Check if script tags are sanitized or rejected
echo "$response" | jq .

# Test 2.3: Oversized Input (DoS via large payload)
echo "Test 2.3: Reject oversized input"
large_string=$(python3 -c "print('A' * 100000)")
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"website\",\"name\":\"$large_string\",\"phone\":\"9876543210\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
    "$BASE_URL/leadWebhook")
print_result "Reject oversized input" "413" "$response"

# Test 2.4: Invalid Phone Number Formats
echo "Test 2.4: Reject invalid phone number"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"John","phone":"123","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook" | jq -r '.ok')
print_result "Reject invalid phone format" "false" "$response"

# Test 2.5: Invalid Email Format
echo "Test 2.5: Handle invalid email gracefully"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"John","phone":"9876543210","email":"not-an-email","city":"Delhi","state":"Delhi","pincode":"110001"}' \
    "$BASE_URL/leadWebhook" | jq -r '.ok')
# Should either reject or accept without email
echo "Response: $response"

# Test 2.6: Missing Required Fields
echo "Test 2.6: Reject request with missing required fields"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"John"}' \
    "$BASE_URL/leadWebhook" | jq -r '.ok')
print_result "Reject missing required fields" "false" "$response"

# Test 2.7: Invalid Pincode Format
echo "Test 2.7: Reject invalid pincode"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"source":"website","name":"John","phone":"9876543210","city":"Delhi","state":"Delhi","pincode":"abc123"}' \
    "$BASE_URL/leadWebhook" | jq -r '.ok')
print_result "Reject invalid pincode" "false" "$response"

echo ""

# ==============================================================================
# TEST 3: Authorization Tests (Role-Based Access)
# ==============================================================================
echo -e "${YELLOW}3. AUTHORIZATION TESTS${NC}"
echo "----------------------------------------"

echo "Note: These tests require valid user tokens with different roles"
echo "Skipping automated role tests - requires manual verification"
echo "Manual tests needed:"
echo "  - Rep cannot access manager-only endpoints"
echo "  - Rep cannot access other user's data"
echo "  - Manager can access team data"
echo "  - Admin can access all data"

echo ""

# ==============================================================================
# TEST 4: GPS & Location Security
# ==============================================================================
echo -e "${YELLOW}4. GPS & LOCATION SECURITY TESTS${NC}"
echo "----------------------------------------"

# Test 4.1: Invalid GPS Coordinates
echo "Test 4.1: Reject invalid GPS coordinates (lat > 90)"
# Would need auth token for this
echo "  (Requires auth token - manual test)"

# Test 4.2: GPS Spoofing Detection
echo "Test 4.2: Detect impossible GPS accuracy (0.001m)"
echo "  (Requires auth token - manual test)"

# Test 4.3: GPS Outside India
echo "Test 4.3: Reject GPS coordinates outside India"
echo "  (Requires auth token - manual test)"

echo ""

# ==============================================================================
# TEST 5: Rate Limiting & DoS Protection
# ==============================================================================
echo -e "${YELLOW}5. RATE LIMITING TESTS${NC}"
echo "----------------------------------------"

echo "Test 5.1: Rapid repeated requests (basic DoS)"
count=0
for i in {1..20}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
        -H "Content-Type: application/json" \
        -d '{"source":"website","name":"John'$i'","phone":"987654321'$i'","city":"Delhi","state":"Delhi","pincode":"110001"}' \
        "$BASE_URL/leadWebhook")
    if [ "$response" == "429" ]; then
        count=$((count + 1))
    fi
    sleep 0.1
done

if [ $count -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Rate limiting detected after $count requests"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: No rate limiting detected (may be expected if not configured)"
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""

# ==============================================================================
# TEST 6: Data Leakage Tests
# ==============================================================================
echo -e "${YELLOW}6. DATA LEAKAGE TESTS${NC}"
echo "----------------------------------------"

# Test 6.1: Error Messages Don't Leak Sensitive Info
echo "Test 6.1: Error messages don't expose internal details"
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"invalid":"data"}' \
    "$BASE_URL/leadWebhook")

# Check if error message contains sensitive keywords
if echo "$response" | grep -qi "stack\|firebase\|admin\|secret\|key"; then
    echo -e "${RED}✗ FAIL${NC}: Error message may leak sensitive information"
    echo "$response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: Error messages are safe"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""

# ==============================================================================
# TEST 7: CORS & Headers
# ==============================================================================
echo -e "${YELLOW}7. CORS & SECURITY HEADERS${NC}"
echo "----------------------------------------"

# Test 7.1: CORS Headers Present
echo "Test 7.1: Check CORS headers"
headers=$(curl -s -I -X OPTIONS "$BASE_URL/leadWebhook")
if echo "$headers" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✓ PASS${NC}: CORS headers present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: CORS headers not found"
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test 7.2: Security Headers
echo "Test 7.2: Check security headers"
if echo "$headers" | grep -qi "x-content-type-options\|x-frame-options"; then
    echo -e "${GREEN}✓ PASS${NC}: Security headers present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ INFO${NC}: Optional security headers not found"
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""

# ==============================================================================
# TEST 8: Business Logic Vulnerabilities
# ==============================================================================
echo -e "${YELLOW}8. BUSINESS LOGIC TESTS${NC}"
echo "----------------------------------------"

# Test 8.1: Duplicate Lead Prevention
echo "Test 8.1: Test duplicate lead handling"
phone="9999999999"
response1=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"website\",\"name\":\"Test User\",\"phone\":\"$phone\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
    "$BASE_URL/leadWebhook" | jq -r '.leadId')

sleep 1

response2=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"website\",\"name\":\"Test User 2\",\"phone\":\"$phone\",\"city\":\"Mumbai\",\"state\":\"Maharashtra\",\"pincode\":\"400001\"}" \
    "$BASE_URL/leadWebhook" | jq -r '.leadId')

if [ "$response1" == "$response2" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Duplicate leads correctly handled (same lead ID)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Duplicate lead created new entry (may be expected)"
    echo "  Lead 1: $response1"
    echo "  Lead 2: $response2"
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test 8.2: Negative Values in Numeric Fields
echo "Test 8.2: Reject negative values"
# Would test expense amounts, sheets count, etc.
echo "  (Requires auth token - manual test needed for expense amounts)"

echo ""

# ==============================================================================
# SUMMARY
# ==============================================================================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Tests Run: $TESTS_RUN"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All automated tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review.${NC}"
    exit 1
fi
