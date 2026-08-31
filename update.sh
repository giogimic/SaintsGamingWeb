#!/bin/bash
# =============================================================================
#  Saints Gaming — Update Shortcut
#  Delegates directly to scripts/update.sh with all supplied arguments.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/scripts/update.sh" "$@"
