#!/bin/bash

# Script to update console statements to use logger across all service files
# This will make the codebase production-ready with less verbose logging

set -e

TANDEM_ROOT="/Users/jasonbartz/Documents/Development Projects/Tandem"
cd "$TANDEM_ROOT"

echo "Updating service files to use logger instead of console statements..."
echo "================================================================"

# List of files to update (services that still have console statements)
FILES=(
  "src/services/ai.service.js"
  "src/services/auth.service.js"
  "src/services/puzzle.service.js"
  "src/services/stats.service.js"
  "src/services/platform.js"
  "src/services/dateService.js"
  "src/services/localDateService.js"
  "src/services/notificationService.js"
  "src/services/subscriptionService.js"
  "src/services/events/GameEventStore.js"
  "src/services/migration/StatsMigrationService.js"
  "src/services/stats/ConflictResolver.js"
  "src/services/stats/UnifiedStatsManager.js"
  "src/services/stats/providers/BaseProvider.js"
  "src/services/stats/providers/LocalStorageProvider.js"
  "src/services/stats/providers/KeyValueStoreProvider.js"
  "src/services/stats/providers/GameCenterProvider.js"
  "src/services/stats/providers/CloudKitProvider.js"
  "src/services/stats/providers/GameCenterProviderWeb.js"
  "src/services/stats/providers/CloudKitProviderWeb.js"
  "src/services/stats/providers/KeyValueStoreProviderWeb.js"
)

count=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Check if logger import already exists
    if ! grep -q "from '@/lib/logger'" "$file" 2>/dev/null && ! grep -q "require('@/lib/logger')" "$file" 2>/dev/null; then
      # Check if it's ES6 or CommonJS
      if grep -q "^import " "$file" 2>/dev/null; then
        # ES6 module - add import after existing imports
        if grep -q "^import " "$file"; then
          # Find last import line
          last_import=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
          sed -i '' "${last_import}a\\
import logger from '@/lib/logger';\\
" "$file"
          echo "  ✓ Added ES6 logger import"
        fi
      elif grep -q "^const.*= require(" "$file" 2>/dev/null || grep -q "^var.*= require(" "$file" 2>/dev/null; then
        # CommonJS - add require after existing requires
        if grep -q "require(" "$file"; then
          last_require=$(grep -n "require(" "$file" | tail -1 | cut -d: -f1)
          sed -i '' "${last_require}a\\
const logger = require('@/lib/logger').default;\\
" "$file"
          echo "  ✓ Added CommonJS logger require"
        fi
      fi
    else
      echo "  ✓ Logger already imported"
    fi

    ((count++))
  fi
done

echo ""
echo "================================================================"
echo "Phase 1 complete: Added logger imports to $count files"
echo "================================================================"
echo ""
echo "Note: Console statements still need to be manually replaced with logger calls."
echo "This script only added the imports. Manual replacement ensures correct error handling."
