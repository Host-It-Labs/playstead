#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/node-env.sh"
playstead_use_node_version "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[playstead] pnpm 9.15.5 is required. Install it with Corepack." >&2
  exit 1
fi

cd "$ROOT_DIR"
pnpm install --frozen-lockfile --prefer-offline
