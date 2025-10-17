#!/bin/bash
# Documentation Cleanup Script
# Generated: 2025-10-17
# Purpose: Archive outdated and redundant documentation files

set -e  # Exit on error

echo "=== Artis Sales Documentation Cleanup ==="
echo ""

# Create archive directory if it doesn't exist
mkdir -p docs/archive/design
mkdir -p docs/archive/development
mkdir -p docs/archive/planning
mkdir -p docs/archive/implementation

echo "✓ Archive directories ready"
echo ""

# 1. DESIGN: Archive outdated THEME_AND_LOGO_GUIDE.md
echo "1. Archiving outdated THEME_AND_LOGO_GUIDE.md..."
if [ -f "docs/design/THEME_AND_LOGO_GUIDE.md" ]; then
    # Add deprecation notice
    echo -e "# ARCHIVED - OUTDATED\n\n**Date Archived**: 2025-10-17\n**Reason**: References deleted asset files and old color codes. Superseded by [BRANDING_GUIDE.md](../design/BRANDING_GUIDE.md)\n\n---\n\n$(cat docs/design/THEME_AND_LOGO_GUIDE.md)" > docs/archive/design/THEME_AND_LOGO_GUIDE.md
    rm docs/design/THEME_AND_LOGO_GUIDE.md
    echo "   ✓ Moved to docs/archive/design/"
else
    echo "   ⚠ File not found, skipping"
fi

# 2. DEVELOPMENT: Archive duplicate METRO_HANG_TROUBLESHOOTING.md
echo "2. Archiving duplicate METRO_HANG_TROUBLESHOOTING.md..."
if [ -f "docs/development/METRO_HANG_TROUBLESHOOTING.md" ]; then
    echo -e "# ARCHIVED - DUPLICATE\n\n**Date Archived**: 2025-10-17\n**Reason**: Problem already solved in [METRO_TROUBLESHOOTING.md](../development/METRO_TROUBLESHOOTING.md) on Oct 9. This doc created Oct 15 for same issue.\n\n---\n\n$(cat docs/development/METRO_HANG_TROUBLESHOOTING.md)" > docs/archive/development/METRO_HANG_TROUBLESHOOTING.md
    rm docs/development/METRO_HANG_TROUBLESHOOTING.md
    echo "   ✓ Moved to docs/archive/development/"
else
    echo "   ⚠ File not found, skipping"
fi

# 3. PLANNING: Archive old NAVIGATION_PLAN.md
echo "3. Archiving superseded NAVIGATION_PLAN.md..."
if [ -f "docs/planning/NAVIGATION_PLAN.md" ]; then
    echo -e "# ARCHIVED - SUPERSEDED\n\n**Date Archived**: 2025-10-17\n**Reason**: Superseded by [COMPLETE_NAVIGATION_PLAN.md](../planning/COMPLETE_NAVIGATION_PLAN.md) (Oct 16, 1 day newer)\n\n---\n\n$(cat docs/planning/NAVIGATION_PLAN.md)" > docs/archive/planning/NAVIGATION_PLAN.md
    rm docs/planning/NAVIGATION_PLAN.md
    echo "   ✓ Moved to docs/archive/planning/"
else
    echo "   ⚠ File not found, skipping"
fi

# 4. PLANNING: Archive old MANAGER_DASHBOARD_PLAN.md
echo "4. Archiving old MANAGER_DASHBOARD_PLAN.md..."
if [ -f "docs/planning/MANAGER_DASHBOARD_PLAN.md" ]; then
    echo -e "# ARCHIVED - SUPERSEDED\n\n**Date Archived**: 2025-10-17\n**Reason**: Oct 11 checkpoint, superseded by [MANAGER_DASHBOARD_COMPLETE.md](../implementation/MANAGER_DASHBOARD_COMPLETE.md) (Oct 16)\n\n---\n\n$(cat docs/planning/MANAGER_DASHBOARD_PLAN.md)" > docs/archive/planning/MANAGER_DASHBOARD_PLAN.md
    rm docs/planning/MANAGER_DASHBOARD_PLAN.md
    echo "   ✓ Moved to docs/archive/planning/"
else
    echo "   ⚠ File not found, skipping"
fi

# 5. IMPLEMENTATION: Archive ambiguous MANAGER_DASHBOARD_IMPLEMENTATION.md
echo "5. Archiving ambiguous MANAGER_DASHBOARD_IMPLEMENTATION.md..."
if [ -f "docs/implementation/MANAGER_DASHBOARD_IMPLEMENTATION.md" ]; then
    echo -e "# ARCHIVED - AMBIGUOUS STATUS\n\n**Date Archived**: 2025-10-17\n**Reason**: Says 'Ready to Implement' but [MANAGER_DASHBOARD_COMPLETE.md](../implementation/MANAGER_DASHBOARD_COMPLETE.md) from same day (Oct 16) shows implementation complete. Likely obsolete planning doc.\n\n---\n\n$(cat docs/implementation/MANAGER_DASHBOARD_IMPLEMENTATION.md)" > docs/archive/implementation/MANAGER_DASHBOARD_IMPLEMENTATION.md
    rm docs/implementation/MANAGER_DASHBOARD_IMPLEMENTATION.md
    echo "   ✓ Moved to docs/archive/implementation/"
else
    echo "   ⚠ File not found, skipping"
fi

# 6. IMPLEMENTATION: Archive old ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md
echo "6. Archiving old ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md..."
if [ -f "docs/implementation/ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md" ]; then
    echo -e "# ARCHIVED - SUPERSEDED\n\n**Date Archived**: 2025-10-17\n**Reason**: Oct 11 6:10 AM checkpoint (75% complete), superseded by [ACCOUNT_MANAGEMENT_FINAL_STATUS.md](../implementation/ACCOUNT_MANAGEMENT_FINAL_STATUS.md) at 6:35 AM same day (95% complete)\n\n---\n\n$(cat docs/implementation/ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md)" > docs/archive/implementation/ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md
    rm docs/implementation/ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md
    echo "   ✓ Moved to docs/archive/implementation/"
else
    echo "   ⚠ File not found, skipping"
fi

echo ""
echo "=== Cleanup Summary ==="
echo "✓ 6 files archived with deprecation notices"
echo "✓ Original files removed from active docs"
echo ""
echo "⚠ ACTION REQUIRED: Check docs/design/BRANDING_TODO.md status"
echo "   → If assets complete: Archive this file too"
echo "   → If pending: Update with current status"
echo ""
echo "Next step: Run 'bash docs/UPDATE_README.sh' to update the documentation index"
