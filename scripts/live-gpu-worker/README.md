# ChapCam Live Pro — Worker GPU (Face Swap temps réel)

Ce dossier contient le serveur **WebSocket** à déployer sur un **pod GPU persistant**
(RunPod « Pods », Vast.ai, Lambda…) pour alimenter la page `/live` avec une latence basse.

> L'app Next.js (v0) parle à ce worker. Elle ne peut pas l'héberger : un GPU est requis.

## 1. Pré-requis

- 1 GPU NVIDIA (RTX 4090 / A10 / L4 recommandé pour < 600 ms).
- Python 3.10+, CUDA 11.8+.
- Les modèles InsightFace : `buffalo_l` (auto-téléchargé) et `inswapper_128.onnx`.

## 2. Installation

\`\`\`bash
pip install insightface onnxruntime-gpu opencv-python-headless websockets numpy
# Placez inswapper_128.onnx dans ~/.insightface/models/ (ou le cwd)
\`\`\`

## 3. Lancement

\`\`\`bash
export LIVE_GPU_SHARED_SECRET="<le-meme-secret-que-dans-l-app>"
export PORT=8765
python server.py
\`\`\`

Exposez le port (RunPod : "TCP Port" ou "HTTP Port") et récupérez l'URL publique.

## 4. Variables d'environnement à définir dans l'app v0 / Vercel

| Variable | Exemple | Rôle |
|----------|---------|------|
| `LIVE_GPU_WS_URL` | `wss://abc-8765.proxy.runpod.net/ws` | URL WebSocket publique du pod |
| `LIVE_GPU_SHARED_SECRET` | `une-longue-chaine-aleatoire` | Secret partagé (HMAC). **Identique** des deux côtés. |

Tant que ces variables ne sont pas définies, `/live` affiche « moteur non configuré »
mais tout le reste (essai, offre, timer) fonctionne.

## 5. Optimisation latence (objectif type LiveSync)

1. **TensorRT** : convertir `inswapper_128.onnx` et le détecteur en moteurs TRT FP16.
   Gain typique x2–x3 sur le temps d'inférence.
2. **det_size** : réduire à `(320, 320)` si la webcam est cadrée serré.
3. **Résolution** : le client envoie déjà des frames downscalées ; ajustez côté `use-live-face-swap.ts`.
4. **Pod proche** : choisissez une région GPU proche de vos utilisateurs.
5. **Garder le pod chaud** : un pod persistant évite tout cold start (contrairement au serverless).

## 6. Protocole (résumé)

1. Connexion : `wss://<pod>/ws?token=<userId.exp.hmac>` → le worker valide le HMAC.
2. Client → `{"type":"persona","images":[dataURL,...]}` (1 à 4 photos).
3. Worker → `{"type":"ready","ok":true}`.
4. Client → frames **JPEG binaires** (webcam).
5. Worker → frames **JPEG binaires** (visage swappé).
