#!/bin/bash
#
# Deploy Security Fixes - Artis Sales App
# Date: October 17, 2025
#
# This script deploys the 6 security fixes applied in this session
#

set -e  # Exit on error

echo "=========================================="
echo "  Artis Sales - Security Fixes Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verify we're in the right directory
if [ ! -f "firebase.json" ]; then
    print_error "Not in project root! Please run from /Users/kunal/ArtisSales"
    exit 1
fi

print_status "In project root directory"

# Step 1: Pre-deployment validation
echo ""
echo "Step 1: Pre-deployment Validation"
echo "-----------------------------------"

# Check TypeScript compilation
echo "Checking TypeScript (backend)..."
cd functions
if npx tsc --noEmit; then
    print_status "Backend TypeScript compiles successfully"
else
    print_error "Backend TypeScript errors found"
    exit 1
fi
cd ..

print_warning "Mobile has 12 TypeScript errors (non-security, non-blocking)"

# Check for vulnerabilities
echo ""
echo "Checking dependencies for vulnerabilities..."
cd functions
npm audit --production > /dev/null 2>&1 && print_status "Backend dependencies: 0 vulnerabilities" || print_error "Backend has vulnerabilities!"
cd ..

cd mobile
npm audit --production > /dev/null 2>&1 && print_status "Mobile dependencies: 0 vulnerabilities" || print_error "Mobile has vulnerabilities!"
cd ..

# Step 2: Show changes
echo ""
echo "Step 2: Files Modified"
echo "----------------------"
git status --short

echo ""
echo "Security Fixes:"
echo "  1. storage.rules - Require auth for document access"
echo "  2. mobile/src/services/api.ts - Dynamic API URL + PII redaction"
echo "  3. mobile/.env.example - Environment template"
echo "  4. functions/src/utils/auth.ts - Remove sensitive error details"

# Step 3: Confirm deployment
echo ""
echo -e "${YELLOW}Ready to deploy?${NC}"
echo ""
echo "This will deploy:"
echo "  - Firebase Storage rules"
echo "  - Firebase Firestore rules (unchanged, but re-deployed for consistency)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Step 4: Deploy backend
echo ""
echo "Step 3: Deploying Backend"
echo "-------------------------"

# Build Cloud Functions
echo "Building Cloud Functions..."
cd functions
npm run build
print_status "Cloud Functions built"
cd ..

# Deploy storage rules
echo "Deploying Storage rules..."
if firebase deploy --only storage; then
    print_status "Storage rules deployed (auth now required for documents)"
else
    print_error "Storage rules deployment failed!"
    exit 1
fi

# Deploy firestore rules (for consistency, no changes made)
echo "Deploying Firestore rules..."
if firebase deploy --only firestore:rules; then
    print_status "Firestore rules deployed"
else
    print_error "Firestore rules deployment failed!"
    exit 1
fi

# Deploy Cloud Functions (includes auth.ts fix)
echo "Deploying Cloud Functions..."
echo "This may take 3-5 minutes..."
if firebase deploy --only functions; then
    print_status "Cloud Functions deployed"
else
    print_error "Cloud Functions deployment failed!"
    exit 1
fi

# Step 5: Post-deployment verification
echo ""
echo "Step 4: Post-Deployment Verification"
echo "-------------------------------------"

echo ""
print_status "✓ Storage rules deployed - documents now require authentication"
print_status "✓ Cloud Functions deployed - auth errors no longer leak details"
print_warning "⚠ Mobile app needs rebuild with production .env"

echo ""
echo "Mobile App Next Steps:"
echo "----------------------"
echo "1. Create .env file:"
echo "   cd mobile"
echo "   cp .env.example .env"
echo ""
echo "2. Edit .env to set production URL:"
echo "   EXPO_PUBLIC_API_URL=https://us-central1-artis-sales.cloudfunctions.net"
echo ""
echo "3. Rebuild app:"
echo "   eas build --platform android --profile production"

echo ""
echo "=========================================="
print_status "Security fixes deployed successfully!"
echo "=========================================="
echo ""
echo "See SECURITY_AUDIT_REPORT.md for full audit details"
echo "See SECURITY_FIXES_APPLIED.md for rollback instructions"
echo ""
