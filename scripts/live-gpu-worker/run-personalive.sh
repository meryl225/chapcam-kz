#!/usr/bin/env bash
# ChapCam Live - lancement du moteur ESSAI GRATUIT (PersonaLive).
#
# Demarre DEUX processus sur le meme pod GPU :
#   1. Le serveur PersonaLive (inference_online.py)  -> http://127.0.0.1:7860
#   2. Le worker ChapCam (server.py) en mode pont    -> ws://0.0.0.0:8765
#
# Le navigateur parle au worker ChapCam (protocole + token HMAC inchanges), et
# le worker relaie les frames vers PersonaLive (bridge_personalive.py).
#
# Usage :
#   export LIVE_GPU_SHARED_SECRET=ton_secret_partage   # MEME valeur que sur Vercel
#   export PERSONALIVE_DIR=/workspace/PersonaLive       # ou est clone GVCLab/PersonaLive
#   bash run-personalive.sh
#
# Variables :
#   LIVE_GPU_SHARED_SECRET (obligatoire) secret HMAC partage avec Vercel
#   PERSONALIVE_DIR        (defaut /workspace/PersonaLive) dossier du repo PersonaLive
#   PERSONALIVE_ACCEL      (defaut none) none | xformers | tensorrt
#                          -> "none" pour les RTX 50-Series (Blackwell)
#   PERSONALIVE_PYTHON     (defaut python) interpreteur de l'env PersonaLive
#   PERSONALIVE_URL        (defaut http://127.0.0.1:7860) base HTTP de PersonaLive
#   CHAPCAM_PORT           (defaut 8765) port WS du worker ChapCam
#   CHAPCAM_MAX_CONCURRENT (defaut 1) sessions PersonaLive simultanees par GPU
#                          -> PersonaLive (diffusion) est lourd : 1 par GPU 12-24 Go.

set -euo pipefail
cd "$(dirname "$0")"

[ -n "${LIVE_GPU_SHARED_SECRET:-}" ] || { echo "[run-pl] ERREUR: LIVE_GPU_SHARED_SECRET manquant." >&2; exit 1; }

PERSONALIVE_DIR="${PERSONALIVE_DIR:-/workspace/PersonaLive}"
PERSONALIVE_ACCEL="${PERSONALIVE_ACCEL:-none}"
PERSONALIVE_PYTHON="${PERSONALIVE_PYTHON:-python}"
export PERSONALIVE_URL="${PERSONALIVE_URL:-http://127.0.0.1:7860}"
export CHAPCAM_ENGINE="personalive"
export CHAPCAM_PORT="${CHAPCAM_PORT:-8765}"
export CHAPCAM_MAX_CONCURRENT="${CHAPCAM_MAX_CONCURRENT:-1}"

[ -d "$PERSONALIVE_DIR" ] || { echo "[run-pl] ERREUR: PERSONALIVE_DIR introuvable: $PERSONALIVE_DIR" >&2; exit 1; }
[ -f "$PERSONALIVE_DIR/inference_online.py" ] || { echo "[run-pl] ERREUR: inference_online.py absent de $PERSONALIVE_DIR" >&2; exit 1; }

# --- 0. Preflight bloquant : torch + CUDA + cuDNN 8 --------------------------
# Evite de demarrer un worker condamne (ex: libcudnn.so.8 manquant). Si ce test
# echoue, relance d'abord :  bash install-personalive.sh
echo "[run-pl] Verification torch / CUDA / cuDNN..."
"${PERSONALIVE_PYTHON}" - <<'PY' || { echo "[run-pl] ERREUR: environnement torch/CUDA invalide. Lance: bash install-personalive.sh" >&2; exit 1; }
import sys, ctypes, torch
print("[run-pl] torch", torch.__version__, "| cuda", torch.cuda.is_available(), "| cudnn", torch.backends.cudnn.version())
try:
    ctypes.CDLL("libcudnn.so.8")
except OSError as e:
    print("[run-pl] libcudnn.so.8 introuvable:", e); sys.exit(2)
sys.exit(0 if torch.cuda.is_available() else 2)
PY

PL_PID=""
WORKER_PID=""
TUNNEL_PID=""
cleanup() {
  echo "[run-pl] Arret..."
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
  [ -n "$PL_PID" ] && kill "$PL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- 1. Serveur PersonaLive (en arriere-plan) --------------------------------
echo "[run-pl] Demarrage de PersonaLive ($PERSONALIVE_ACCEL) dans $PERSONALIVE_DIR ..."
(
  cd "$PERSONALIVE_DIR"
  exec "$PERSONALIVE_PYTHON" inference_online.py --acceleration "$PERSONALIVE_ACCEL"
) &
PL_PID=$!
echo "[run-pl] PersonaLive PID=$PL_PID. Attente du chargement des modeles..."

# --- 1b. Test bloquant : PersonaLive doit REELLEMENT repondre avant le worker
# On attend que le serveur 7860 reponde (modeles charges). Si PersonaLive meurt
# entre-temps, on s'arrete au lieu de lancer un worker inutile.
PL_TIMEOUT="${PERSONALIVE_BOOT_TIMEOUT:-600}"   # secondes (chargement diffusion = long)
waited=0
until "${PERSONALIVE_PYTHON}" - "$PERSONALIVE_URL" <<'PY'
import sys, urllib.request
url = sys.argv[1].rstrip("/")
for path in ("/", "/api/queue", "/config"):
    try:
        with urllib.request.urlopen(url + path, timeout=5) as r:
            if r.status < 500:
                sys.exit(0)
    except Exception:
        pass
sys.exit(1)
PY
do
  if ! kill -0 "$PL_PID" 2>/dev/null; then
    echo "[run-pl] ERREUR: PersonaLive s'est arrete pendant le chargement (voir logs ci-dessus)." >&2
    exit 1
  fi
  if [ "$waited" -ge "$PL_TIMEOUT" ]; then
    echo "[run-pl] ERREUR: PersonaLive n'a pas repondu apres ${PL_TIMEOUT}s sur $PERSONALIVE_URL." >&2
    exit 1
  fi
  sleep 5; waited=$((waited+5))
  echo "[run-pl] ... en attente de PersonaLive (${waited}s)"
done
echo "[run-pl] PersonaLive est pret (${waited}s)."

# --- 2. Worker ChapCam (pont) en arriere-plan --------------------------------
echo "[run-pl] Demarrage du worker ChapCam (port $CHAPCAM_PORT, moteur=personalive)..."
python server.py > /tmp/chapcam-worker.log 2>&1 &
WORKER_PID=$!

# Attendre que le worker ecoute vraiment sur le port
for _ in $(seq 1 30); do
  if curl -sS -m 2 "http://localhost:$CHAPCAM_PORT/" >/dev/null 2>&1; then
    echo "[run-pl] Worker ChapCam pret."
    break
  fi
  sleep 1
done

# --- 3. Tunnel Cloudflare + auto-decouverte (URL STABLE cote Vercel) ---------
# Le navigateur ne peut pas ouvrir un WebSocket via le proxy HTTP de RunPod
# (502). On expose donc le worker via un tunnel Cloudflare (wss://...).
# L'URL du tunnel change a chaque relance MAIS on l'ecrit dans un fichier que
# server.py sert sur /tunnel-url. Cote Vercel, il suffit de configurer le
# pod-id stable (RUNPOD_TRIAL_POD_ID) : l'app recupere l'URL courante toute
# seule via https://<podId>-<port>.proxy.runpod.net/tunnel-url.
# => Plus jamais besoin de coller une URL ni de redeployer.
TUNNEL_URL_FILE="${CHAPCAM_TUNNEL_URL_FILE:-/tmp/chapcam-tunnel-url.txt}"
rm -f "$TUNNEL_URL_FILE"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[run-pl] Installation de cloudflared..."
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

start_tunnel() {
  : > /tmp/chapcam-tunnel.log
  cloudflared tunnel --no-autoupdate --url "http://localhost:$CHAPCAM_PORT" \
    > /tmp/chapcam-tunnel.log 2>&1 &
  TUNNEL_PID=$!
  local url=""
  for _ in $(seq 1 30); do
    url=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" /tmp/chapcam-tunnel.log | head -1 || true)
    [ -n "$url" ] && break
    sleep 1
  done
  if [ -n "$url" ]; then
    echo "wss://${url#https://}" > "$TUNNEL_URL_FILE"
    echo "[run-pl] Tunnel actif : wss://${url#https://}"
    echo "[run-pl] (auto-decouverte : configure RUNPOD_TRIAL_POD_ID sur Vercel, rien a coller)"
  else
    echo "[run-pl] ATTENTION : URL du tunnel introuvable (voir /tmp/chapcam-tunnel.log)" >&2
  fi
}

echo "[run-pl] Ouverture du tunnel Cloudflare..."
start_tunnel

# --- 4. Surveillance : relance le tunnel s'il tombe (nouvelle URL ecrite) ----
echo "[run-pl] Systeme Live pret. Laisse cette fenetre/session ouverte."
while kill -0 "$WORKER_PID" 2>/dev/null; do
  sleep 5
  if [ -n "$PL_PID" ] && ! kill -0 "$PL_PID" 2>/dev/null; then
    echo "[run-pl] ERREUR : PersonaLive s'est arrete." >&2
    break
  fi
  if [ -n "$TUNNEL_PID" ] && ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "[run-pl] Tunnel tombe -> relance + nouvelle URL."
    rm -f "$TUNNEL_URL_FILE"
    start_tunnel
  fi
done
