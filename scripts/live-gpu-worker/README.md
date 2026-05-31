# ChapCam Live Pro — Worker GPU (Face Swap temps réel)

Ce dossier contient le serveur **WebSocket** à déployer sur un **pod GPU persistant**
(RunPod « Pods », Vast.ai, Lambda…) pour alimenter la page `/live` avec une latence basse.

> L'app Next.js (v0) parle à ce worker. Elle ne peut pas l'héberger : un GPU est requis.

## 1. Pré-requis

- 1 GPU NVIDIA (RTX 4090 / 5090 / A10 / L4 recommandé pour < 600 ms).
- Python 3.10+, CUDA 11.8+ (le template RunPod « Pytorch 2.8 » convient).
- Les modèles InsightFace : `buffalo_l` **et** `inswapper_128.onnx` se
  **téléchargent automatiquement** au 1er démarrage (rien à placer à la main).

## 2. Déploiement RunPod (sans SSH, via Jupyter)

1. RunPod → **Deploy a Pod** → **GPU Pods** (pas Serverless), RTX 4090/5090,
   template **Runpod Pytorch 2.8**, coche **Start Jupyter notebook**, **Deploy**.
2. Pod → **Connect** → **Connect to Jupyter Lab** → **File ▸ New ▸ Terminal**.
3. Récupère le worker (glisse `server.py` dans Jupyter, ou clone le repo) :

\`\`\`bash
git clone https://github.com/meryl225/chapcam-kz.git
cd chapcam-kz/scripts/live-gpu-worker
\`\`\`

## 3. Installation & lancement

\`\`\`bash
pip install insightface onnxruntime-gpu opencv-python-headless websockets numpy

# Utilise LE MEME secret que la variable LIVE_GPU_SHARED_SECRET du site :
export LIVE_GPU_SHARED_SECRET="4CtW2rKdisYD08W0YaW7oa7QVzEL8IoP6mzw460VCo4y6WhNM1dclJChsh24aEy2"
export PORT=8765
python server.py
\`\`\`

Au 1er lancement, le modèle (~530 Mo) se télécharge, puis :
`[worker] WebSocket en écoute sur 0.0.0.0:8765`. **Laisse ce terminal ouvert.**

Ensuite : page du pod → **Edit ▸ Expose HTTP Ports** → ajoute **8765**.
RunPod fournit une URL publique, ex. `https://xxxxx-8765.proxy.runpod.net`.

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
