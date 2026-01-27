#!/bin/bash
# Pre-tool-use hook: Warn about potentially destructive bash commands
# Returns permissionDecision: "ask" for dangerous operations

# Read input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Patterns for destructive operations
DESTRUCTIVE_PATTERNS=(
  "rm -rf"
  "rm -r"
  "git reset --hard"
  "git clean -f"
  "DROP TABLE"
  "DROP DATABASE"
  "DELETE FROM"
  "TRUNCATE"
  "git push.*--force"
  "git push.*-f"
  "npx supabase db reset"
  "supabase db reset"
)

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    cat << EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"This command contains a potentially destructive operation: $pattern. Please confirm you want to proceed."}}
EOF
    exit 0
  fi
done

exit 0
