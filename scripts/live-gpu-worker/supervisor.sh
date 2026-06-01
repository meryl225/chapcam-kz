#!/usr/bin/env bash
# ============================================================================
# ChapCam Live - SUPERVISEUR PRODUCTION 24h/24 (worker GPU + tunnel Cloudflare).
#
# Role : c'est le programme a lancer AU DEMARRAGE DU POD RunPod.
#        Il (re)demarre et SURVEILLE en boucle :
#          1. le worker GPU (server.py)
#          2. le tunnel Cloudflare (wss:// public)
#        et redemarre automatiquement tout composant tombe (crash, reboot,
#        migration de Pod, chute du tunnel, worker fige).
#
# Tolerance aux pannes :
#   - worker mort        -> relance immediate
#   - worker fige        -> watchdog /health : N echecs => kill + relance
#   - tunnel mort         -> relance + nouvelle URL ecrite dans le fichier
#                            (l'app la redecouvre via /tunnel-url, rien a coller)
#
# Installation comme service au boot du Pod RunPod :
#   Mettre ceci dans "Container Start Command" du template RunPod :
#     bash -lc 'cd /workspace/live-gpu-worker && LIVE_GPU_SHARED_SECRET=xxx bash supervisor.sh'
#   (ou via le Dockerfile : CMD ["bash", "supervisor.sh"])
#
# Variables :
#   LIVE_GPU_SHARED_SECRET   (obligatoire) secret partage avec Vercel
#   LIVE_GPU_PORT            (defaut 8765)
#   CHAPCAM_USE_TRT          (defaut 0)
#   CHAPCAM_MAX_CONCURRENT   (defaut 4) sessions GPU simultanees par worker
#   SUP_HEALTH_FAILS         (defaut 4) echecs /health consecutifs avant kill
#   SUP_HEALTH_INTERVAL      (defaut 5) secondes entre deux checks
# ============================================================================

set -uo pipefail
cd "$(dirname "$0")"

PORT="${LIVE_GPU_PORT:-8765}"
export CHAPCAM_PORT="$PORT"
export CHAPCAM_USE_TRT="${CHAPCAM_USE_TRT:-0}"
export CHAPCAM_MAX_CONCURRENT="${CHAPCAM_MAX_CONCURRENT:-4}"

HEALTH_FAILS_MAX="${SUP_HEALTH_FAILS:-4}"
HEALTH_INTERVAL="${SUP_HEALTH_INTERVAL:-5}"
TUNNEL_URL_FILE="${CHAPCAM_TUNNEL_URL_FILE:-/tmp/chapcam-tunnel-url.txt}"
WORKER_LOG="/tmp/chapcam-worker.log"
TUNNEL_LOG="/tmp/chapcam-tunnel.log"

if [ -z "${LIVE_GPU_SHARED_SECRET:-}" ]; then
  echo "[sup] ERREUR : LIVE_GPU_SHARED_SECRET n'est pas defini." >&2
  exit 1
fi

log() { echo "[sup $(date '+%H:%M:%S')] $*"; }

# --- Librairies CUDA/cuDNN (pip nvidia-*) pour qu'ONNX Runtime voie le GPU ---
EXTRA_LD=$(python -c "import os,glob,nvidia; base=os.path.dirname(nvidia.__file__); print(':'.join(glob.glob(base+'/*/lib')))" 2>/dev/null || true)
if [ -n "$EXTRA_LD" ]; then
  export LD_LIBRARY_PATH="$EXTRA_LD:${LD_LIBRARY_PATH:-}"
fi

# --- Installer cloudflared si absent ---
ensure_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then return 0; fi
  log "Installation de cloudflared..."
  local arch cf_arch
  arch=$(uname -m)
  case "$arch" in
    x86_64|amd64) cf_arch=amd64 ;;
    aarch64|arm64) cf_arch=arm64 ;;
    *) cf_arch=amd64 ;;
  esac
  curl -fsSL -o /usr/local/bin/cloudflared \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${cf_arch}" \
    && chmod +x /usr/local/bin/cloudflared
}

WORKER_PID=""
TUNNEL_PID=""

start_worker() {
  log "Demarrage du worker GPU (port $PORT, max_concurrent=$CHAPCAM_MAX_CONCURRENT)..."
  python server.py >>"$WORKER_LOG" 2>&1 &
  WORKER_PID=$!
}

start_tunnel() {
  log "Ouverture du tunnel Cloudflare..."
  : >"$TUNNEL_LOG"
  cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >>"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  # Recuperer l'URL publique (jusqu'a 30 s) et l'ecrire pour l'auto-decouverte
  local url=""
  for _ in $(seq 1 30); do
    url=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" "$TUNNEL_LOG" | head -1 || true)
    [ -n "$url" ] && break
    sleep 1
  done
  if [ -n "$url" ]; then
    echo "wss://${url#https://}" >"$TUNNEL_URL_FILE"
    log "Tunnel actif : wss://${url#https://}"
  else
    log "ATTENTION : URL du tunnel introuvable (voir $TUNNEL_LOG)"
  fi
}

worker_alive()  { [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; }
tunnel_alive()  { [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; }

worker_healthy() {
  # 200 = pret. 503 = en cours de chargement du modele (on patiente, pas un echec).
  local code
  code=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "http://localhost:$PORT/health" 2>/dev/null || echo 000)
  [ "$code" = "200" ] || [ "$code" = "503" ]
}

stop_all() {
  log "Arret..."
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
}
trap 'stop_all; exit 0' INT TERM

# ============================ BOUCLE DE SUPERVISION ============================
ensure_cloudflared
rm -f "$TUNNEL_URL_FILE"
start_worker
start_tunnel

health_fails=0
while true; do
  sleep "$HEALTH_INTERVAL"

  # 1) Worker mort -> relance
  if ! worker_alive; then
    log "Worker absent -> relance."
    rm -f "$TUNNEL_URL_FILE"
    start_worker
    health_fails=0
    continue
  fi

  # 2) Worker fige (process vivant mais /health ne repond plus) -> kill + relance
  if worker_healthy; then
    health_fails=0
  else
    health_fails=$((health_fails + 1))
    log "Worker injoignable ($health_fails/$HEALTH_FAILS_MAX)."
    if [ "$health_fails" -ge "$HEALTH_FAILS_MAX" ]; then
      log "Worker fige -> kill et relance."
      kill -9 "$WORKER_PID" 2>/dev/null || true
      rm -f "$TUNNEL_URL_FILE"
      start_worker
      health_fails=0
      continue
    fi
  fi

  # 3) Tunnel mort -> relance + nouvelle URL
  if ! tunnel_alive; then
    log "Tunnel absent -> relance."
    start_tunnel
  fi
done
