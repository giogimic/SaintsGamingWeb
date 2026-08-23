#!/usr/bin/env bash
# Compatibility wrapper for setup-the-lobby.sh
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$DIR/setup-the-lobby.sh" "$@"
