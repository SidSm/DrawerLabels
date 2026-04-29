#!/usr/bin/env bash
# Wait for Docker daemon, then bring DrawerLabels stack up. Invoked by launchd at login.
set -euo pipefail

cd "$(dirname "$0")/.."

# Make sure Docker Desktop CLI is on PATH whether Intel or Apple Silicon brew or DD.app.
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:${PATH:-/usr/bin:/bin}"

# Launch Docker Desktop if not running (no-op when already running).
open -ga Docker || true

# Wait up to 120s for daemon socket.
for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

docker compose up -d
