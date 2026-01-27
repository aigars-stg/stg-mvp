#!/bin/bash
# Session start hook: Load project context at session start
# Provides git status and project reminders

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Build context string
CONTEXT="Second Turn Games - Session Context\n\n"

# Check git status
if [ -d "$PROJECT_DIR/.git" ]; then
  BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")
  UNCOMMITTED=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  CONTEXT+="Git: Branch '$BRANCH' with $UNCOMMITTED uncommitted file(s)\n"
fi

# Build order reminder
CONTEXT+="\nBuild Order: Always run 'pnpm build:ds' before 'pnpm build:marketplace'\n"

# Brand voice reminder
CONTEXT+="Brand Voice: Use 'pre-loved' not 'used'. No exclamation marks. European date format (dd.MM.yyyy).\n"

# Escape for JSON output
CONTEXT_ESCAPED=$(echo -e "$CONTEXT" | jq -Rs .)

cat << EOF
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":$CONTEXT_ESCAPED}}
EOF

exit 0
