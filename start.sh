#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
  echo "Missing .env file. Create it from .env.example and add your database settings."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ".env"
set +a

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting SmartShift AI..."
echo "API: http://localhost:${API_PORT:-3001}/api/docs"
echo "Web: http://localhost:3000"

npm run dev:api &
API_PID=$!

npm run dev:web &
WEB_PID=$!

cleanup() {
  echo
  echo "Stopping SmartShift AI..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$API_PID" "$WEB_PID"
