# ChapCam Live - Worker GPU (mode cloud)
# Image CUDA + cuDNN compatible onnxruntime-gpu 1.18 (CUDA 12.x).
# Deployable sur n'importe quel fournisseur GPU (Vast.ai, Lambda, RunPod, serveur perso...).

FROM nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    CHAPCAM_MODEL_ROOT=/models \
    CHAPCAM_PORT=8765

# Dependances systeme (OpenCV a besoin de libGL, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip \
        libgl1 libglib2.0-0 \
        ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY engine.py auth.py queue_manager.py server.py download_models.py ./

# Pre-telechargement des modeles dans l'image (evite le cold start au 1er run)
RUN python3 download_models.py || echo "[build] modeles a telecharger au runtime"

EXPOSE 8765

# LIVE_GPU_SHARED_SECRET doit etre passe au runtime (-e LIVE_GPU_SHARED_SECRET=...)
CMD ["python3", "server.py"]
