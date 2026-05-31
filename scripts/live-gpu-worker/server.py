"""
ChapCam Live Pro - Worker GPU Face Swap temps reel (serveur WebSocket)
=======================================================================

A deployer sur un POD GPU PERSISTANT (RunPod "Pods", pas serverless) pour
obtenir une latence basse facon LiveSync.

Pipeline : InsightFace (detection) + inswapper_128 (swap) + GFPGAN optionnel.
Pour des perfs maximales, convertir les modeles en TensorRT (voir README).

Protocole WebSocket (binaire + JSON) :
  1. Le client se connecte a  wss://<pod>/ws?token=<userId.exp.hmac>
  2. Le serveur valide le token HMAC (meme secret que LIVE_GPU_SHARED_SECRET).
  3. Le client envoie un message JSON {type:"persona", images:[dataURL,...]} (1 a 4).
  4. Le client envoie ensuite des frames JPEG binaires (la webcam).
  5. Le serveur renvoie pour chaque frame un JPEG binaire (le visage swappe).

Variables d'environnement attendues sur le pod :
  LIVE_GPU_SHARED_SECRET : doit etre IDENTIQUE a  celui de l'app Next.js.
"""

import os
import time
import hmac
import json
import base64
import hashlib
import asyncio
import urllib.request
from urllib.parse import urlparse, parse_qs

import numpy as np
import cv2
import websockets
import insightface
from insightface.app import FaceAnalysis

SHARED_SECRET = os.environ.get("LIVE_GPU_SHARED_SECRET", "")
PORT = int(os.environ.get("PORT", "8765"))
PROVIDERS = ["CUDAExecutionProvider", "CPUExecutionProvider"]

# Modele de swap : telecharge automatiquement au 1er demarrage s'il manque.
MODEL_DIR = os.path.expanduser("~/.insightface/models")
MODEL_PATH = os.path.join(MODEL_DIR, "inswapper_128.onnx")
# Miroir public du modele inswapper_128 (~530 Mo). Surchargeable via env.
MODEL_URL = os.environ.get(
    "INSWAPPER_URL",
    "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
)


def ensure_model() -> str:
    """Telecharge inswapper_128.onnx si absent, renvoie son chemin local."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 100_000_000:
        print(f"[worker] Modele deja present : {MODEL_PATH}")
        return MODEL_PATH
    print(f"[worker] Telechargement du modele depuis {MODEL_URL} ...")
    tmp = MODEL_PATH + ".part"
    urllib.request.urlretrieve(MODEL_URL, tmp)
    os.replace(tmp, MODEL_PATH)
    print(f"[worker] Modele telecharge : {MODEL_PATH}")
    return MODEL_PATH


# ----------------------------------------------------------------------
# Chargement des modeles (une seule fois au demarrage du pod)
# ----------------------------------------------------------------------
print("[worker] Chargement des modeles InsightFace...")
face_app = FaceAnalysis(name="buffalo_l", providers=PROVIDERS)
face_app.prepare(ctx_id=0, det_size=(640, 640))
swapper = insightface.model_zoo.get_model(ensure_model(), providers=PROVIDERS)
print("[worker] Modeles prets.")


def verify_token(token: str) -> bool:
    """Valide le token HMAC '<userId>.<exp>.<sig>' signe par l'app Next.js."""
    if not SHARED_SECRET or not token:
        return False
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False
        user_id, exp, sig = parts
        if int(exp) < int(time.time()):
            return False  # token expire
        payload = f"{user_id}.{exp}"
        expected = hmac.new(
            SHARED_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


def decode_data_url(data_url: str) -> np.ndarray:
    """Decode une image dataURL base64 en image OpenCV BGR."""
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    raw = base64.b64decode(data_url)
    arr = np.frombuffer(raw, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def extract_token(ws) -> str:
    """Recupere ?token=... quelle que soit la version de la lib websockets."""
    raw_path = ""
    # websockets >= 11 : le chemin est sur ws.request.path
    req = getattr(ws, "request", None)
    if req is not None and getattr(req, "path", None):
        raw_path = req.path
    elif getattr(ws, "path", None):  # versions plus anciennes
        raw_path = ws.path
    if not raw_path:
        return ""
    query = urlparse(raw_path).query
    return parse_qs(query).get("token", [""])[0]


async def handle(ws):
    # 1. Authentification via le token dans la query string
    token = extract_token(ws)
    if not verify_token(token):
        await ws.close(code=4001, reason="token invalide")
        return

    source_face = None
    print("[worker] Client connecte et authentifie.")

    try:
        async for message in ws:
            # Message JSON = configuration du persona (images de reference)
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                except Exception:
                    continue
                if data.get("type") == "persona":
                    images = data.get("images", [])[:4]
                    best = None
                    for d in images:
                        img = decode_data_url(d)
                        if img is None:
                            continue
                        faces = face_app.get(img)
                        if faces:
                            # On garde le plus grand visage detecte
                            f = max(
                                faces,
                                key=lambda x: (x.bbox[2] - x.bbox[0])
                                * (x.bbox[3] - x.bbox[1]),
                            )
                            best = f
                    source_face = best
                    await ws.send(
                        json.dumps(
                            {"type": "ready", "ok": source_face is not None}
                        )
                    )
                continue

            # Message binaire = frame webcam JPEG a  swapper
            if source_face is None:
                # Pas encore de persona : on renvoie la frame inchangee
                await ws.send(message)
                continue

            arr = np.frombuffer(message, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            faces = face_app.get(frame)
            for target in faces:
                frame = swapper.get(
                    frame, target, source_face, paste_back=True
                )

            ok, buf = cv2.imencode(
                ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80]
            )
            if ok:
                await ws.send(buf.tobytes())
    except websockets.ConnectionClosed:
        pass
    finally:
        print("[worker] Client deconnecte.")


async def main():
    print(f"[worker] WebSocket en ecoute sur 0.0.0.0:{PORT}")
    async with websockets.serve(
        handle, "0.0.0.0", PORT, max_size=8 * 1024 * 1024
    ):
        await asyncio.Future()  # tourne indefiniment


if __name__ == "__main__":
    asyncio.run(main())
