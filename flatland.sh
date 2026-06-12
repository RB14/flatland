#!/usr/bin/env bash
# Serve FLATLAND: ASCENSION locally (static site — no build step).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8000}"

echo "FLATLAND: ASCENSION → http://localhost:${PORT}"
exec python3 -m http.server "$PORT" --directory "$SCRIPT_DIR"
