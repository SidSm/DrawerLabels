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

ensure_docker_login_item() {
    # Add Docker.app to user's Login Items (no sudo, idempotent). macOS 13+.
    local app="/Applications/Docker.app"
    [[ -d "$app" ]] || return 0
    if osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null | grep -qi 'Docker'; then
        echo "Docker already in Login Items."
    else
        osascript -e 'tell application "System Events" to make login item at end with properties {path:"/Applications/Docker.app", hidden:true}' >/dev/null \
            && echo "Added Docker.app to Login Items." \
            || echo "WARN: could not add Docker to Login Items. Add manually: System Settings → General → Login Items." >&2
    fi
}

print_boot_instructions() {
    cat <<'EOF'

────────────────────────────────────────────────────────────────────
The LaunchAgent fires at LOGIN (per-user), not at cold boot.
For full power-button → app-running behavior:

  1. System Settings → Users & Groups → "Automatically log in as" → pick user.
     (Disabled if FileVault is on. Disable FileVault if you want headless boot.)
  2. Docker Desktop → Settings → General → "Start Docker Desktop when you sign in" → ON.
     (Already ensured via Login Items above, but flip the toggle inside DD too if it asks.)
  3. Reboot to test.
────────────────────────────────────────────────────────────────────
EOF
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

    ensure_docker_login_item

    echo "Installed: ${PLIST}"
    echo "Logs:      ${OUT_LOG} / ${ERR_LOG}"
    echo "Stack will auto-start at login. To remove: $0 --uninstall"
    print_boot_instructions
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
