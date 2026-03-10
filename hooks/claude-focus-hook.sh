#!/usr/bin/env bash
# Claude Code hook script — sends a focus request to the VS Code extension
# Reads JSON from stdin (provided by Claude Code hooks system)

INPUT=$(cat)
MESSAGE=$(echo "$INPUT" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
TYPE=$(echo "$INPUT" | grep -o '"notification_type":"[^"]*"' | head -1 | cut -d'"' -f4)

PORT="${CLAUDE_FOCUS_PORT:-19876}"

curl -s -X POST "http://127.0.0.1:${PORT}/focus" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"${MESSAGE:-Claude Code needs your attention}\",\"type\":\"${TYPE}\"}" \
  --connect-timeout 1 \
  --max-time 2 \
  > /dev/null 2>&1 || true
