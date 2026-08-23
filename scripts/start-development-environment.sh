#!/usr/bin/env bash
set -euo pipefail

attach=false
for argument in "$@"; do
  case "$argument" in
    --attach)
      attach=true
      ;;
    *)
      echo "[playstead] unsupported start option: $argument" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_FILE="$ROOT_DIR/.playstead/dev-runtime.env"
COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.dev.yml")

for dependency in docker tmux curl; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "[playstead] $dependency is required to start the development environment." >&2
    exit 1
  fi
done

# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/node-env.sh"
playstead_use_node_version "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[playstead] pnpm 9.15.5 is required. Install it with Corepack." >&2
  exit 1
fi

cd "$ROOT_DIR"
node "$ROOT_DIR/scripts/prepare-development-environment.mjs"

set -a
# shellcheck disable=SC1090
. "$RUNTIME_FILE"
set +a

compose=(docker compose "${COMPOSE_FILES[@]}" -p "$PLAYSTEAD_COMPOSE_PROJECT")
"${compose[@]}" up -d postgres redis

wait_for_dependency() {
  local name="$1"
  shift

  for attempt in $(seq 1 40); do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi

    if [[ "$attempt" -eq 40 ]]; then
      echo "[playstead] $name did not become ready." >&2
      "${compose[@]}" logs --no-color --tail=80 "$name" || true
      return 1
    fi

    sleep 1
  done
}

wait_for_dependency postgres "${compose[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
wait_for_dependency redis "${compose[@]}" exec -T redis redis-cli ping

pnpm --filter @playstead/shared build
pnpm --filter @playstead/game-atlas-drop build
pnpm migration:run

tmux kill-session -t "$PLAYSTEAD_TMUX_SESSION" >/dev/null 2>&1 || true
tmux new-session -d -s "$PLAYSTEAD_TMUX_SESSION" -n dev -c "$ROOT_DIR"
backend_pane="$(tmux display-message -p -t "$PLAYSTEAD_TMUX_SESSION":dev '#{pane_id}')"
frontend_pane="$(tmux split-window -h -P -F '#{pane_id}' -t "$backend_pane" -c "$ROOT_DIR")"
shell_pane="$(tmux split-window -h -P -F '#{pane_id}' -t "$frontend_pane" -c "$ROOT_DIR")"
tmux select-layout -t "$PLAYSTEAD_TMUX_SESSION":dev even-horizontal >/dev/null
tmux set-option -t "$PLAYSTEAD_TMUX_SESSION" mouse on >/dev/null
tmux select-pane -t "$backend_pane" -T backend
tmux select-pane -t "$frontend_pane" -T frontend
tmux select-pane -t "$shell_pane" -T shell

SHELL_BIN="${SHELL:-/bin/zsh}"
printf -v root_q '%q' "$ROOT_DIR"
printf -v runtime_q '%q' "$RUNTIME_FILE"
common_setup=". ${root_q}/scripts/node-env.sh && playstead_use_node_version ${root_q} && set -a && . ${runtime_q} && set +a"

run_pane() {
  local pane="$1"
  local command="$2"
  local label="$3"

  tmux respawn-pane -k -t "$pane" -c "$ROOT_DIR" "$SHELL_BIN" -lc \
    "$common_setup && $command; status=\$?; if [[ \$status -ne 0 ]]; then echo '[playstead] $label exited with status' \$status; fi; exec \"$SHELL_BIN\" -l"
}

run_pane "$backend_pane" "pnpm run dev:backend" backend
run_pane "$frontend_pane" "pnpm run dev:frontend" frontend
run_pane "$shell_pane" \
  "echo '[playstead] frontend: $PLAYSTEAD_FRONTEND_URL'; echo '[playstead] backend: $PLAYSTEAD_BACKEND_URL'; exec \"$SHELL_BIN\" -l" \
  shell

wait_for_http() {
  local label="$1"
  local url="$2"
  local pane="$3"

  for attempt in $(seq 1 60); do
    if curl --silent --fail --max-time 5 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [[ "$attempt" -eq 60 ]]; then
      echo "[playstead] $label did not become healthy at $url." >&2
      tmux capture-pane -p -t "$pane" -S -80 || true
      return 1
    fi

    sleep 1
  done
}

wait_for_http backend "$PLAYSTEAD_BACKEND_URL/api/health" "$backend_pane"
wait_for_http frontend "$PLAYSTEAD_FRONTEND_URL" "$frontend_pane"

tmux select-pane -t "$shell_pane"
tmux select-window -t "$PLAYSTEAD_TMUX_SESSION":dev

echo "[playstead] development environment is ready."
echo "[playstead] frontend: $PLAYSTEAD_FRONTEND_URL"
echo "[playstead] backend: $PLAYSTEAD_BACKEND_URL"

if [[ "$attach" == "true" ]]; then
  if [[ -n "${TMUX:-}" ]]; then
    exec tmux switch-client -t "$PLAYSTEAD_TMUX_SESSION"
  fi
  exec tmux attach-session -t "$PLAYSTEAD_TMUX_SESSION"
fi

echo "[playstead] attach with: tmux attach -t $PLAYSTEAD_TMUX_SESSION"
