#!/bin/bash

# Test Rate Limiting - Sends 110 requests to verify rate limiter works

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="https://us-central1-artis-sales-dev.cloudfunctions.net"

echo "=========================================="
echo "Rate Limiting Test"
echo "=========================================="
echo ""
echo "This will send 110 requests to test rate limiting"
echo "Expected: Rate limit should trigger around request 100"
echo ""
read -p "Press Enter to continue..."
echo ""

rate_limited=false
rate_limit_count=0

for i in {1..110}; do
    response=$(curl -s -w "%{http_code}" -o /tmp/rate-test.json \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"source\":\"rate-test\",\"name\":\"Test$i\",\"phone\":\"98765432$(printf %02d $((i % 100)))\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
        "$BASE_URL/leadWebhook" 2>/dev/null)

    if [ "$response" == "200" ]; then
        echo "Request $i: ✓ Success (HTTP 200)"
    elif [ "$response" == "429" ]; then
        if [ "$rate_limited" = false ]; then
            echo ""
            echo -e "${GREEN}✅ RATE LIMIT TRIGGERED at request $i${NC}"
            echo ""
            rate_limited=true
            rate_limit_count=$i
        fi
        echo "Request $i: ⛔ Rate Limited (HTTP 429)"
    else
        echo "Request $i: ⚠️  HTTP $response"
    fi

    sleep 0.1
done

echo ""
echo "=========================================="
echo "Results"
echo "=========================================="

if [ "$rate_limited" = true ]; then
    echo -e "${GREEN}✅ PASS: Rate limiting is working${NC}"
    echo "   Rate limit triggered at request: $rate_limit_count"
    echo "   Expected: ~100 requests"

    if [ $rate_limit_count -ge 95 ] && [ $rate_limit_count -le 105 ]; then
        echo -e "   ${GREEN}Rate limit threshold is correct!${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Rate limit threshold might need adjustment${NC}"
        echo "   Expected: 100, Got: $rate_limit_count"
    fi
else
    echo -e "${RED}❌ FAIL: Rate limiting did NOT trigger${NC}"
    echo "   All 110 requests succeeded"
    echo ""
    echo "Possible causes:"
    echo "  1. Rate limiter middleware not properly configured"
    echo "  2. Express app not wrapping Cloud Function correctly"
    echo "  3. Function needs redeployment"
    echo ""
    echo "Check function logs:"
    echo "  firebase functions:log --only leadWebhook"
fi

echo ""
