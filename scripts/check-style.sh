#!/bin/bash
# Style Guide Checker - runs after Edit/Write on component files
# Checks for common violations of docs/Style.md

# Read the hook input from stdin
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

# Exit early if no file path or file doesn't match component paths
if [ -z "$FILE" ]; then
  exit 0
fi

# Only check .jsx files in src/components/ or src/app/
case "$FILE" in
  */src/components/*.jsx|*/src/app/*.jsx) ;;
  *) exit 0 ;;
esac

# Exit if file doesn't exist (was deleted)
if [ ! -f "$FILE" ]; then
  exit 0
fi

VIOLATIONS=""

# 1. Check for hardcoded hex colors (excluding known brand colors and CSS variable definitions)
# Known exceptions: Google OAuth (#4285F4, #34A853, #FBBC05, #EA4335), Discord (#5865F2)
HEX_MATCHES=$(grep -nE '#[0-9a-fA-F]{3,8}' "$FILE" | \
  grep -v '4285F4\|34A853\|FBBC05\|EA4335\|5865F2' | \
  grep -v '// brand color\|// third-party\|// exception' | \
  grep -v 'from-\[#\|to-\[#\|via-\[#' || true)

if [ -n "$HEX_MATCHES" ]; then
  VIOLATIONS="${VIOLATIONS}HARDCODED HEX COLORS - Use Tailwind tokens (bg-accent-green, text-accent-blue, etc.) instead of raw hex values. See docs/Style.md Section 1.\n"
fi

# 2. Check for bg-white (should use bg-ghost-white or bg-bg-surface)
BG_WHITE=$(grep -n 'bg-white' "$FILE" | grep -v 'ghost-white\|bg-white/' || true)
if [ -n "$BG_WHITE" ]; then
  VIOLATIONS="${VIOLATIONS}BG-WHITE USAGE - Use bg-ghost-white or bg-bg-surface instead of bg-white. See docs/Style.md Section 1.\n"
fi

# 3. Check for blur-based shadows (our style is offset, no blur)
BLUR_SHADOWS=$(grep -nE 'shadow-(sm|md|lg|xl|2xl|inner)' "$FILE" || true)
if [ -n "$BLUR_SHADOWS" ]; then
  VIOLATIONS="${VIOLATIONS}BLUR SHADOWS - Use offset shadows (shadow-[4px_4px_0px_...]) not Tailwind blur shadows. See docs/Style.md Section 4.\n"
fi

# 4. Check for arbitrary spacing values
ARB_SPACING=$(grep -noE '(p|m|gap|space)-\[[0-9]+px\]' "$FILE" | \
  grep -v 'calc(env' || true)
if [ -n "$ARB_SPACING" ]; then
  VIOLATIONS="${VIOLATIONS}ARBITRARY SPACING - Use Tailwind spacing scale (p-4, gap-2, etc.) instead of arbitrary values. See docs/Style.md Section 3.\n"
fi

# 5. Check for font-light (not in our weight scale)
FONT_LIGHT=$(grep -n 'font-light' "$FILE" || true)
if [ -n "$FONT_LIGHT" ]; then
  VIOLATIONS="${VIOLATIONS}FONT-LIGHT USAGE - font-light is not part of our weight scale. Use font-normal, font-medium, font-semibold, or font-bold. See docs/Style.md Section 2.\n"
fi

# Output results
if [ -n "$VIOLATIONS" ]; then
  # Return as JSON with context for the model
  VIOLATIONS_ESCAPED=$(echo -e "$VIOLATIONS" | jq -Rs .)
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"Style Guide Violations found in ${FILE}:\\n${VIOLATIONS}\\nRefer to docs/Style.md for the correct tokens and patterns. Fix these before proceeding.\"}}"
  exit 0
fi

exit 0
