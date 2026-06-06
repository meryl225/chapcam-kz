#!/usr/bin/env bash
# ChapCam Live - INSTALLATION PROPRE du moteur ESSAI GRATUIT (PersonaLive)
# sur un pod RunPod neuf (RTX 4090 / CUDA 12.x, image runpod/pytorch:2.4.x).
#
# Pourquoi ce script existe :
#   PersonaLive tourne sous torch 2.1.0 (=> cuDNN 8 / libcudnn.so.8).
#   Le requirements.txt du moteur InsightFace installe onnxruntime-gpu +
#   nvidia-cudnn-cu12==9.*, ce qui ECRASE cuDNN 8 et casse PersonaLive
#   (ImportError: libcudnn.so.8). On ne doit donc JAMAIS installer
#   requirements.txt sur le pod PersonaLive : uniquement ce script.
#
# Pre-requis :
#   git clone https://github.com/GVCLab/PersonaLive  /workspace/PersonaLive
#   (et python tools/download_weights.py deja fait)
#
# Usage :
#   export PERSONALIVE_DIR=/workspace/PersonaLive   # defaut
#   bash install-personalive.sh
#
set -euo pipefail
cd "$(dirname "$0")"

PERSONALIVE_DIR="${PERSONALIVE_DIR:-/workspace/PersonaLive}"
PY="${PERSONALIVE_PYTHON:-python}"
PIP="$PY -m pip"
PIP_FLAGS="--no-cache-dir --timeout 120 --retries 10"

# Versions verrouillees, compatibles entre elles et avec cuDNN 8 (CUDA 12.1).
TORCH_VER="2.1.0"
TV_VER="0.16.0"
TA_VER="2.1.0"
TORCH_INDEX="https://download.pytorch.org/whl/cu121"

echo "[install-pl] Dossier PersonaLive : $PERSONALIVE_DIR"
[ -d "$PERSONALIVE_DIR" ] || { echo "[install-pl] ERREUR: clone GVCLab/PersonaLive dans $PERSONALIVE_DIR d'abord." >&2; exit 1; }

# --- 1. Pile torch alignee EN PREMIER ---------------------------------------
# Les wheels cu121 de download.pytorch.org embarquent cuDNN 8 (libcudnn.so.8),
# donc pas de dependance vers nvidia-cudnn-cu12 9.* depuis PyPI.
echo "[install-pl] 1/4 torch==$TORCH_VER torchvision==$TV_VER torchaudio==$TA_VER (cu121, cuDNN 8)..."
$PIP install $PIP_FLAGS --force-reinstall \
  "torch==$TORCH_VER" "torchvision==$TV_VER" "torchaudio==$TA_VER" \
  --index-url "$TORCH_INDEX"

# --- 2. Dependances de base de PersonaLive ----------------------------------
# On retire torch/vision/audio du requirements pour ne PAS re-changer la pile
# qu'on vient de figer (PersonaLive epingle parfois des versions differentes).
if [ -f "$PERSONALIVE_DIR/requirements_base.txt" ]; then
  echo "[install-pl] 2/4 requirements_base.txt de PersonaLive (sans torch*)..."
  grep -viE '^\s*(torch|torchvision|torchaudio)\b' "$PERSONALIVE_DIR/requirements_base.txt" \
    > /tmp/pl_base_no_torch.txt || true
  $PIP install $PIP_FLAGS -r /tmp/pl_base_no_torch.txt
else
  echo "[install-pl] 2/4 (pas de requirements_base.txt, on saute)"
fi

# --- 3. Dependances du pont ChapCam (PAS requirements.txt InsightFace) -------
echo "[install-pl] 3/4 requirements-personalive.txt (pont ChapCam)..."
$PIP install $PIP_FLAGS -r requirements-personalive.txt

# --- 4. Verification bloquante ----------------------------------------------
echo "[install-pl] 4/4 Verification torch / CUDA / cuDNN..."
$PY - <<'PY'
import sys, ctypes
import torch
print("[verify] torch       :", torch.__version__)
print("[verify] cuda dispo   :", torch.cuda.is_available())
print("[verify] cudnn version:", torch.backends.cudnn.version())
try:
    import torchaudio, torchvision
    print("[verify] torchaudio  :", torchaudio.__version__)
    print("[verify] torchvision :", torchvision.__version__)
except Exception as e:
    print("[verify] WARN torchvision/torchaudio:", e)
# libcudnn.so.8 doit etre chargeable
try:
    ctypes.CDLL("libcudnn.so.8")
    print("[verify] libcudnn.so.8: OK")
except OSError as e:
    print("[verify] libcudnn.so.8: INTROUVABLE ->", e); sys.exit(2)
if not torch.cuda.is_available():
    print("[verify] ECHEC: CUDA non detecte."); sys.exit(2)
print("[verify] Environnement PersonaLive OK.")
PY

echo "[install-pl] Termine. Lance ensuite : bash run-personalive.sh"
