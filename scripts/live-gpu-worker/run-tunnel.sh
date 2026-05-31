#!/usr/bin/env bash
# ChapCam Live - worker GPU + tunnel Cloudflare (wss:// public, gratuit).
#
# Pourquoi : le navigateur (page HTTPS) se connecte DIRECTEMENT au worker en
# WebSocket securise. Le proxy HTTP de RunPod (*.proxy.runpod.net) ne gere PAS
# l'upgrade WebSocket (erreur 502 Cloudflare). Un tunnel Cloudflare expose le
# worker en wss://....trycloudflare.com qui supporte parfaitement le WebSocket.
#
# Usage :
#   LIVE_GPU_SHARED_SECRET=ton_secret bash run-tunnel.sh
#
# A la fin, le script affiche l'URL a coller dans LIVE_GPU_WS_URL sur Vercel,
# au format : wss://<sous-domaine>.trycloudflare.com

set -e
cd "$(dirname "$0")"

PORT="${LIVE_GPU_PORT:-8765}"
export CHAPCAM_PORT="$PORT"
export CHAPCAM_USE_TRT="${CHAPCAM_USE_TRT:-0}"

if [ -z "$LIVE_GPU_SHARED_SECRET" ]; then
  echo "[run-tunnel] ERREUR : LIVE_GPU_SHARED_SECRET n'est pas defini." >&2
  echo "             Relance avec : LIVE_GPU_SHARED_SECRET=ton_secret bash run-tunnel.sh" >&2
  exit 1
fi

# 1. Librairies CUDA/cuDNN pour le GPU
EXTRA_LD=$(python -c "import os,glob,nvidia; base=os.path.dirname(nvidia.__file__); print(':'.join(glob.glob(base+'/*/lib')))" 2>/dev/null || true)
if [ -n "$EXTRA_LD" ]; then
  export LD_LIBRARY_PATH="$EXTRA_LD:$LD_LIBRARY_PATH"
fi

# 2. Installer cloudflared si absent
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[run-tunnel] Installation de cloudflared..."
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64|amd64) CF_ARCH=amd64 ;;
    aarch64|arm64) CF_ARCH=arm64 ;;
    *) CF_ARCH=amd64 ;;
  esac
  curl -fsSL -o /usr/local/bin/cloudflared \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
  chmod +x /usr/local/bin/cloudflared
fi

# 3. Demarrer le worker en arriere-plan
# Effacer l'ancienne URL pour ne pas servir une valeur perimee au demarrage
rm -f "${CHAPCAM_TUNNEL_URL_FILE:-/tmp/chapcam-tunnel-url.txt}"
echo "[run-tunnel] Demarrage du worker GPU sur le port $PORT..."
python server.py > /tmp/chapcam-worker.log 2>&1 &
WORKER_PID=$!

cleanup() {
  echo "[run-tunnel] Arret..."
  kill "$WORKER_PID" 2>/dev/null || true
  kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Attendre que le worker ecoute
echo "[run-tunnel] Attente du worker..."
for i in $(seq 1 30); do
  if curl -sS -m 2 "http://localhost:$PORT/" >/dev/null 2>&1; then
    echo "[run-tunnel] Worker pret."
    break
  fi
  sleep 1
done

# 4. Lancer le tunnel Cloudflare et extraire l'URL publique
echo "[run-tunnel] Ouverture du tunnel Cloudflare..."
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" > /tmp/chapcam-tunnel.log 2>&1 &
TUNNEL_PID=$!

echo "[run-tunnel] Recherche de l'URL publique..."
PUBLIC_URL=""
for i in $(seq 1 30); do
  PUBLIC_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" /tmp/chapcam-tunnel.log | head -1 || true)
  if [ -n "$PUBLIC_URL" ]; then break; fi
  sleep 1
done

TUNNEL_URL_FILE="${CHAPCAM_TUNNEL_URL_FILE:-/tmp/chapcam-tunnel-url.txt}"

echo ""
echo "=================================================================="
if [ -n "$PUBLIC_URL" ]; then
  WSS_URL="wss://${PUBLIC_URL#https://}"
  # Ecrire l'URL pour que le worker la serve sur /tunnel-url (auto-decouverte)
  echo "$WSS_URL" > "$TUNNEL_URL_FILE"
  echo "  TUNNEL ACTIF (auto-decouverte activee)"
  echo ""
  echo "  URL publique du moteur Live :"
  echo "      $WSS_URL"
  echo ""
  echo "  Rien a coller : le site recupere cette URL automatiquement"
  echo "  via RUNPOD_POD_ID. (Tu peux aussi la mettre dans LIVE_GPU_WS_URL"
  echo "   si tu preferes la fixer manuellement.)"
  echo ""
else
  echo "  URL du tunnel introuvable. Voir : cat /tmp/chapcam-tunnel.log"
fi
echo "=================================================================="
echo "  Logs worker : tail -f /tmp/chapcam-worker.log"
echo "  Logs tunnel : tail -f /tmp/chapcam-tunnel.log"
echo "  Laisse cette fenetre OUVERTE (Ctrl+C pour tout arreter)."
echo "=================================================================="

# Garder le script vivant tant que worker + tunnel tournent
wait "$WORKER_PID"
