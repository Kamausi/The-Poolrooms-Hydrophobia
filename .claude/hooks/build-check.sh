#!/usr/bin/env bash
# PostToolUse (Edit|Write): after a change under src/ or index.html, run the production build (about 2 s).
# A failed build is reported back with the end of its output so the error is fixed before moving on.
f=$(jq -r '.tool_input.file_path // empty')
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
case "$f" in
  "$root"/src/*|"$root"/index.html) ;;
  *) exit 0 ;;
esac
out=$(cd "$root" && npx vite build --logLevel error 2>&1)
if [ $? -ne 0 ]; then
  jq -n --arg r "$(printf 'vite build failed after editing %s:\n%s' "$f" "$(printf '%s' "$out" | tail -25)")" '{decision:"block",reason:$r}'
fi
exit 0
