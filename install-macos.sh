#!/usr/bin/env bash
# Install / uninstall DrawerLabels LaunchAgent so docker compose stack auto-starts at login.
# Usage:
#   ./install-macos.sh            # install + load
#   ./install-macos.sh --uninstall
set -euo pipefail

LABEL="com.drawerlabels"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
HELPER="${PROJECT_DIR}/scripts/start-docker-stack.sh"
LOG_DIR="$HOME/Library/Logs"
OUT_LOG="${LOG_DIR}/drawerlabels.out.log"
ERR_LOG="${LOG_DIR}/drawerlabels.err.log"

require_macos() {
    if [[ "$(uname -s)" != "Darwin" ]]; then
        echo "This script targets macOS (Darwin). Detected: $(uname -s)." >&2
        exit 1
    fi
}

require_docker() {
    if ! command -v docker >/dev/null 2>&1 && [[ ! -x /Applications/Docker.app/Contents/Resources/bin/docker ]]; then
        echo "Docker not found. Install Docker Desktop first: https://www.docker.com/products/docker-desktop/" >&2
        exit 1
    fi
}

uninstall() {
    if [[ -f "$PLIST" ]]; then
        launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
        launchctl unload "$PLIST" 2>/dev/null || true
        rm -f "$PLIST"
        echo "Removed $PLIST"
    else
        echo "No LaunchAgent to remove."
    fi
}

install() {
    if [[ ! -x "$HELPER" ]]; then
        chmod +x "$HELPER"
    fi

    mkdir -p "$LOG_DIR" "$(dirname "$PLIST")"

    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${HELPER}</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>StandardOutPath</key><string>${OUT_LOG}</string>
    <key>StandardErrorPath</key><string>${ERR_LOG}</string>
    <key>WorkingDirectory</key><string>${PROJECT_DIR}</string>
</dict>
</plist>
EOF

    # Reload (bootout then bootstrap is the modern launchctl idiom).
    launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    launchctl kickstart -k "gui/$(id -u)/${LABEL}"

    echo "Installed: ${PLIST}"
    echo "Logs:      ${OUT_LOG} / ${ERR_LOG}"
    echo "Stack will auto-start at login. To remove: $0 --uninstall"
}

require_macos
case "${1:-}" in
    --uninstall|-u)
        uninstall
        ;;
    "")
        require_docker
        install
        ;;
    *)
        echo "Usage: $0 [--uninstall]" >&2
        exit 2
        ;;
esac
