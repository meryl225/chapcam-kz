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

PL_PID=""
cleanup() {
  echo "[run-pl] Arret..."
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
echo "[run-pl] PersonaLive PID=$PL_PID. Le worker attendra qu'il soit pret."

# --- 2. Worker ChapCam (pont) ------------------------------------------------
# server.py interroge PERSONALIVE_URL/api/queue jusqu'a ce que le modele soit charge.
echo "[run-pl] Demarrage du worker ChapCam (port $CHAPCAM_PORT, moteur=personalive)..."
exec python server.py
