#!/bin/bash
# Post-tool-use hook: Suggest verification after file changes
# Provides context-aware suggestions based on file type

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"
CONTEXT=""

# TypeScript/JavaScript files in marketplace package
if [[ "$EXT" == "ts" || "$EXT" == "tsx" || "$EXT" == "js" || "$EXT" == "jsx" ]]; then
  if [[ "$FILE_PATH" == *"packages/marketplace"* ]]; then
    CONTEXT="TypeScript file modified. Consider running 'pnpm type-check' to verify."
  fi
fi

# Translation files
if [[ "$FILE_PATH" == *"messages"* && "$EXT" == "json" ]]; then
  CONTEXT="Translation file modified. Ensure keys exist in all locale files (en.json, lv.json)."
fi

# Database types file
if [[ "$FILE_PATH" == *"database.types.ts"* ]]; then
  CONTEXT="Database types file modified. This should be auto-generated with 'npx supabase gen types typescript'."
fi

# Supabase migration files
if [[ "$FILE_PATH" == *"supabase/migrations"* ]]; then
  CONTEXT="Migration file modified. Remember to regenerate types after applying: 'npx supabase gen types typescript'."
fi

# Design system changes
if [[ "$FILE_PATH" == *"packages/design-system"* ]]; then
  CONTEXT="Design system modified. Run 'pnpm build:ds' before testing in marketplace."
fi

if [ -n "$CONTEXT" ]; then
  # Escape for JSON
  CONTEXT_ESCAPED=$(echo "$CONTEXT" | sed 's/"/\\"/g')
  cat << EOF
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"$CONTEXT_ESCAPED"}}
EOF
fi

exit 0
