"""
ChapCam Live - Serveur WebSocket GPU (mode cloud).

Branche par l'app Next.js via LIVE_GPU_WS_URL (ex: wss://gpu.tondomaine.com/ws).
Le navigateur se connecte avec ?token=<userId.exp.hmac>.

Protocole (cf. hooks/use-live-face-swap.ts) :
  -> client : { "type": "config", "references": ["url1", ...] }
  <- worker : { "type": "queue", "position": N, "total": M }   (si file d'attente)
  <- worker : { "type": "ready" }
  -> client : frame binaire JPEG
  <- worker : frame binaire JPEG (swappee)
  <- worker : { "type": "error", "message": "..." }

Lancement :
    python server.py
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.request
from http import HTTPStatus
from urllib.parse import urlparse, parse_qs

import websockets

from engine import SwapEngine, new_track
from auth import verify_token
from queue_manager import GpuQueue, QueueFull

HOST = os.getenv("CHAPCAM_HOST", "0.0.0.0")
PORT = int(os.getenv("CHAPCAM_PORT", os.getenv("PORT", "8765")))
MAX_REFERENCES = 4
JPEG_QUALITY = int(os.getenv("CHAPCAM_JPEG_QUALITY", "70"))

# Moteur Live actif :
#   "insightface" (defaut) -> face swap classique (engine.py, abonnes/payant)
#   "personalive"          -> animation de portrait PersonaLive (essai gratuit 2 min)
# En mode personalive, server.py ne charge PAS InsightFace : il relaie les frames
# vers le serveur PersonaLive local via bridge_personalive.py.
ENGINE = os.getenv("CHAPCAM_ENGINE", "insightface").strip().lower()
USE_PERSONALIVE = ENGINE == "personalive"

engine = SwapEngine()
queue = GpuQueue()

# Etat de sante du worker (expose sur /health).
STARTED_AT = time.time()
MODEL_READY = False  # passe a True une fois le modele charge en VRAM


def _fetch_image_bytes(url: str, timeout: float = 10.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "ChapCam-GPU/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


async def _send_json(ws, obj) -> None:
    await ws.send(json.dumps(obj))


# Fichier ou run-tunnel.sh ecrit l'URL publique Cloudflare (wss://...).
TUNNEL_URL_FILE = os.getenv("CHAPCAM_TUNNEL_URL_FILE", "/tmp/chapcam-tunnel-url.txt")


def _read_tunnel_url() -> str:
    try:
        with open(TUNNEL_URL_FILE, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except Exception:  # noqa: BLE001
        return ""


def _request_path(*args) -> str:
    """Recupere le chemin demande quelle que soit la version de websockets."""
    # Nouvelle API : (connection, request) -> request.path
    if len(args) == 2 and hasattr(args[0], "respond"):
        return getattr(args[1], "path", "") or ""
    # Ancienne API : (path, headers)
    return args[0] if args and isinstance(args[0], str) else ""


def _is_ws_upgrade(headers) -> bool:
    """Detecte une vraie negociation WebSocket.

    On considere que c'est un WS upgrade si l'en-tete Upgrade vaut "websocket"
    OU si l'en-tete Sec-WebSocket-Key est present (signal definitif, jamais
    present sur une simple requete HTTP GET de health-check).
    """
    def _get(name: str) -> str:
        try:
            return str(headers.get(name, "") or headers.get(name.lower(), "") or "")
        except Exception:  # noqa: BLE001
            return ""

    if _get("Sec-WebSocket-Key"):
        return True
    return _get("Upgrade").lower() == "websocket"


async def process_request(*args):
    """Repond 200 OK aux requetes HTTP simples (health-check du proxy RunPod /
    Cloudflare) tout en laissant passer les vraies negociations WebSocket.

    Compatible :
      - websockets >= 13 : process_request(connection, request)
      - websockets < 13  : process_request(path, request_headers)
    """
    path = _request_path(*args)
    clean_path = path.split("?", 1)[0].rstrip("/")
    is_tunnel_url = clean_path == "/tunnel-url"
    is_health = clean_path == "/health"

    # Charge courante + readiness du worker (pour le load-balancing multi-GPU).
    # Tant que le modele n'est pas charge, on renvoie 503 : le superviseur patiente
    # et l'app n'envoie aucun utilisateur sur ce worker.
    def _health_payload() -> dict:
        free = max(0, queue.max_concurrent - queue.active) if MODEL_READY else 0
        return {
            "ok": MODEL_READY,
            "ready": MODEL_READY,
            "active": queue.active,
            "waiting": queue.waiting,
            "max": queue.max_concurrent,
            "free": free,
            "uptime": round(time.time() - STARTED_AT, 1),
        }

    health_status = HTTPStatus.OK if MODEL_READY else HTTPStatus.SERVICE_UNAVAILABLE

    # Nouvelle API (websockets >= 13) : (connection, request)
    if len(args) == 2 and hasattr(args[0], "respond"):
        connection, request = args
        if _is_ws_upgrade(getattr(request, "headers", {})):
            return None  # laisser le handshake WebSocket continuer
        if is_tunnel_url:
            body = json.dumps({"wss_url": _read_tunnel_url()}) + "\n"
            return connection.respond(HTTPStatus.OK, body)
        if is_health:
            body = json.dumps(_health_payload()) + "\n"
            return connection.respond(health_status, body)
        return connection.respond(HTTPStatus.OK, "ChapCam GPU worker OK\n")

    # Ancienne API (websockets < 13) : (path, request_headers)
    request_headers = args[1] if len(args) >= 2 else {}
    if _is_ws_upgrade(request_headers):
        return None
    if is_tunnel_url:
        body = (json.dumps({"wss_url": _read_tunnel_url()}) + "\n").encode("utf-8")
        return (HTTPStatus.OK, [("Content-Type", "application/json")], body)
    if is_health:
        body = (json.dumps(_health_payload()) + "\n").encode("utf-8")
        return (health_status, [("Content-Type", "application/json")], body)
    return (HTTPStatus.OK, [("Content-Type", "text/plain")], b"ChapCam GPU worker OK\n")


def _extract_query(ws) -> dict:
    """Recupere la query string quelle que soit la version de websockets."""
    raw_path = ""
    req = getattr(ws, "request", None)
    if req is not None and getattr(req, "path", None):
        raw_path = req.path
    elif getattr(ws, "path", None):
        raw_path = ws.path
    return parse_qs(urlparse(raw_path).query) if raw_path else {}


async def handle(ws):
    # 1) Authentification via le token dans l'URL
    qs = _extract_query(ws)
    token = (qs.get("token") or [None])[0]
    info = verify_token(token)
    if not info:
        await _send_json(ws, {"type": "error", "message": "Token invalide ou expire."})
        await ws.close()
        return

    user_id = info.user_id
    mode = (qs.get("mode") or ["trial"])[0]
    print(f"[server] Connexion user={user_id} mode={mode}")

    ticket = None
    try:
        # 2) Attendre le message de config (references persona)
        raw = await asyncio.wait_for(ws.recv(), timeout=30)
        if isinstance(raw, bytes):
            await _send_json(ws, {"type": "error", "message": "Config attendue avant les frames."})
            return
        msg = json.loads(raw)
        if msg.get("type") != "config":
            await _send_json(ws, {"type": "error", "message": "Premier message doit etre 'config'."})
            return

        references = (msg.get("references") or [])[:MAX_REFERENCES]
        if not references:
            await _send_json(ws, {"type": "error", "message": "Au moins une photo de reference est requise."})
            return

        # 3) File d'attente GPU : on attend un slot libre
        async def on_position(position, total):
            try:
                await _send_json(ws, {"type": "queue", "position": position, "total": total})
            except Exception:  # noqa: BLE001
                pass

        try:
            ticket = await queue.acquire(user_id, mode, on_position)
        except QueueFull:
            await _send_json(ws, {
                "type": "error",
                "code": "busy",
                "message": "Service sature, tous les GPU sont occupes. Reessaie dans un instant.",
            })
            return

        # --- Moteur PersonaLive (essai gratuit) : on delegue toute la session
        # au pont, qui relaie les frames vers le serveur PersonaLive local. ---
        if USE_PERSONALIVE:
            from bridge_personalive import run_personalive_session

            await run_personalive_session(ws, references, _send_json)
            return

        # 4) Preparer le visage source a partir de la premiere reference exploitable
        source_face = None
        for url in references:
            try:
                data = await asyncio.to_thread(_fetch_image_bytes, url)
                source_face = await asyncio.to_thread(engine.build_source_from_bytes, data)
                if source_face is not None:
                    break
            except Exception as e:  # noqa: BLE001
                print(f"[server] reference KO {url}: {e}")

        if source_face is None:
            await _send_json(ws, {"type": "error", "message": "Aucun visage detecte sur les photos de reference."})
            return

        # 5) Pret : on signale au client de commencer a envoyer des frames
        await _send_json(ws, {"type": "ready"})
        track = new_track()

        # --- Instrumentation perf (moyennes glissantes) ---
        n = 0
        acc = {"decode": 0.0, "detect": 0.0, "swap": 0.0, "encode": 0.0, "server": 0.0}
        detect_count = 0
        last_report = time.perf_counter()

        # 6) Boucle de traitement des frames
        async for message in ws:
            if isinstance(message, str):
                try:
                    ctrl = json.loads(message)
                    if ctrl.get("type") == "stop":
                        break
                except Exception:  # noqa: BLE001
                    pass
                continue

            t_server0 = time.perf_counter()
            # Tout le pipeline GPU dans UN seul saut de thread (moins d'overhead)
            out, st = await asyncio.to_thread(
                engine.process_jpeg, message, source_face, track, JPEG_QUALITY
            )
            server_ms = (time.perf_counter() - t_server0) * 1000.0
            if out:
                await ws.send(out)

            # Accumulation des metriques
            n += 1
            acc["decode"] += st.get("decode_ms", 0.0)
            acc["detect"] += st.get("detect_ms", 0.0)
            acc["swap"] += st.get("swap_ms", 0.0)
            acc["encode"] += st.get("encode_ms", 0.0)
            acc["server"] += server_ms
            if st.get("detected"):
                detect_count += 1

            # Rapport toutes les ~2 s : log serveur + message stats au client
            elapsed = time.perf_counter() - last_report
            if elapsed >= 2.0 and n > 0:
                gpu_fps = n / elapsed
                avg = {k: round(v / n, 1) for k, v in acc.items()}
                det_avg = round(acc["detect"] / detect_count, 1) if detect_count else 0.0
                print(
                    f"[perf] {gpu_fps:4.1f} fps GPU | server {avg['server']}ms "
                    f"(decode {avg['decode']} | detect {det_avg} x{detect_count}/{n} "
                    f"| swap {avg['swap']} | encode {avg['encode']})",
                    flush=True,
                )
                try:
                    await _send_json(
                        ws,
                        {
                            "type": "stats",
                            "gpuFps": round(gpu_fps, 1),
                            "serverMs": avg["server"],
                            "decodeMs": avg["decode"],
                            "detectMs": det_avg,
                            "swapMs": avg["swap"],
                            "encodeMs": avg["encode"],
                        },
                    )
                except Exception:  # noqa: BLE001
                    pass
                n = 0
                detect_count = 0
                acc = {"decode": 0.0, "detect": 0.0, "swap": 0.0, "encode": 0.0, "server": 0.0}
                last_report = time.perf_counter()

    except asyncio.CancelledError:
        try:
            await _send_json(ws, {"type": "error", "message": "Session annulee."})
        except Exception:  # noqa: BLE001
            pass
    except websockets.ConnectionClosed:
        pass
    except Exception as e:  # noqa: BLE001
        print(f"[server] Exception user={user_id}: {e}")
        try:
            await _send_json(ws, {"type": "error", "message": "Erreur interne du moteur Live."})
        except Exception:  # noqa: BLE001
            pass
    finally:
        if ticket is not None:
            await ticket.release()
        else:
            await queue.cancel(user_id)
        print(f"[server] Deconnexion user={user_id}")


async def main():
    global MODEL_READY
    if USE_PERSONALIVE:
        from bridge_personalive import PERSONALIVE_URL, wait_until_ready

        print(f"[server] Moteur PersonaLive. Attente du serveur PersonaLive sur {PERSONALIVE_URL} ...")
        ready = await wait_until_ready()
        if not ready:
            print("[server] ATTENTION : PersonaLive n'a pas repondu a temps. Le worker demarre quand meme.")
        MODEL_READY = True
    else:
        print("[server] Chargement du moteur de face swap (InsightFace)...")
        await asyncio.to_thread(engine.load)
        MODEL_READY = True
    print(f"[server] Worker GPU pret (moteur={ENGINE}). Sessions GPU simultanees max : {queue.max_concurrent}")
    print(f"[server] Ecoute WebSocket sur ws://{HOST}:{PORT}")
    async with websockets.serve(
        handle,
        HOST,
        PORT,
        max_size=8 * 1024 * 1024,
        # ping_timeout : ferme une connexion morte (client parti, reseau coupe)
        # au bout de 20 s -> le slot GPU est libere automatiquement.
        ping_interval=20,
        ping_timeout=20,
        process_request=process_request,
    ):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
