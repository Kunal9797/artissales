#!/bin/bash

# Test script for logVisit API
# This will fail with auth error but shows you how to call it

URL="https://us-central1-artis-sales-dev.cloudfunctions.net/logVisit"

# Test data
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "accountId": "test_account_123",
    "purpose": "meeting",
    "lat": 28.6139,
    "lon": 77.2090,
    "accuracyM": 25,
    "notes": "Discussed Q4 targets",
    "photos": []
  }'

echo ""
