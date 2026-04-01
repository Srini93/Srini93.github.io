#!/usr/bin/env sh
# Block accidental commits of Groq-style API keys (gsk_...) and obvious OpenAI keys.
set -e
cd "$(dirname "$0")/../.."

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

matches=$(git diff --cached --name-only -z --diff-filter=ACM | xargs -0 grep -l -E '(^|[^A-Za-z0-9])(gsk_[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{10,})' 2>/dev/null || true)
if [ -n "$matches" ]; then
  echo "Refusing commit: possible API key pattern in staged file(s):" >&2
  echo "$matches" >&2
  echo "Remove the secret; use env vars / host secrets only. See backend/SECRETS.md" >&2
  exit 1
fi

exit 0
