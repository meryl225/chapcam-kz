#!/usr/bin/env bash
# ChapCam Live - lancement du worker GPU (mode cloud).
# Configure automatiquement les librairies CUDA/cuDNN puis demarre le serveur.
#
# Usage :
#   LIVE_GPU_SHARED_SECRET=ton_secret bash run.sh
#
# Variables utiles :
#   LIVE_GPU_SHARED_SECRET  (obligatoire) secret partage avec Vercel
#   LIVE_GPU_PORT           (defaut 8765)
#   CHAPCAM_USE_TRT         (defaut 0) mettre 1 pour activer TensorRT si installe

set -e
cd "$(dirname "$0")"

# Ajoute toutes les librairies NVIDIA installees par pip (cuDNN, cuBLAS, cudart...)
# au chemin de recherche, pour qu'ONNX Runtime trouve le GPU.
EXTRA_LD=$(python -c "import os,glob,nvidia; base=os.path.dirname(nvidia.__file__); print(':'.join(glob.glob(base+'/*/lib')))" 2>/dev/null || true)
if [ -n "$EXTRA_LD" ]; then
  export LD_LIBRARY_PATH="$EXTRA_LD:$LD_LIBRARY_PATH"
fi

export CHAPCAM_USE_TRT="${CHAPCAM_USE_TRT:-0}"

echo "[run] LD_LIBRARY_PATH configure pour le GPU"
echo "[run] Demarrage du worker..."
exec python server.py
