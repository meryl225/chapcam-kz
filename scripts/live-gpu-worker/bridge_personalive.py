"""
Pont PersonaLive  <->  protocole ChapCam Live.

Contexte
--------
ChapCam a deux moteurs Live :
  - InsightFace (engine.py)   : face swap classique (la base actuelle).
  - PersonaLive (ce fichier)  : animation de portrait (CVPR 2026, GVCLab),
                                utilisee pour l'ESSAI GRATUIT 2 min.

Le navigateur parle TOUJOURS le meme protocole ChapCam a notre worker
(server.py) : token HMAC + frames JPEG binaires. Quand le worker est lance avec
CHAPCAM_ENGINE=personalive, server.py delegue la session a ce pont, qui relaie
les frames vers le serveur PersonaLive (inference_online.py) tournant en local
sur le MEME pod (port 7860 par defaut).

Protocole PersonaLive (cf. inference_online.py / webcam/util.py) :
  - POST {base}/api/upload_reference_image   (multipart 'ref_image')
        -> pipeline.fuse_reference(img)   (definit le portrait a animer)
  - POST {base}/api/reset                    (remet le pipeline a zero)
  - WS   {ws_base}/api/ws/{uuid}
        -> on envoie des bytes (frame "driving" = la webcam)         [bytes_to_tensor]
        <- on recoit des bytes (frame generee, JPEG)                 [pil_to_frame]
        texte {"status":"resume"} -> le serveur repond {"status":"send_frame"}

bytes_to_tensor accepte directement des bytes JPEG, et pil_to_frame renvoie des
bytes JPEG : le relais est donc un simple passe-plat binaire dans les deux sens,
parfaitement aligne avec le front ChapCam (use-live-face-swap.ts).

Important
---------
PersonaLive est un moteur STREAMABLE (diffusion) : il ne produit pas forcement
exactement une frame de sortie par frame d'entree. C'est sans danger ici car le
front ChapCam regule son debit par "frames en vol" (back-pressure AIMD) : il se
cale automatiquement sur la cadence de sortie de PersonaLive. La latence affichee
reste indicative.
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid

import aiohttp
import websockets


# Base HTTP du serveur PersonaLive (inference_online.py) sur le pod.
PERSONALIVE_URL = os.getenv("PERSONALIVE_URL", "http://127.0.0.1:7860").rstrip("/")
# Delai max d'attente que PersonaLive soit pret (modele charge) au demarrage.
PERSONALIVE_BOOT_TIMEOUT = float(os.getenv("PERSONALIVE_BOOT_TIMEOUT", "600"))
# Timeout de telechargement d'une photo de reference.
REF_FETCH_TIMEOUT = float(os.getenv("CHAPCAM_REF_TIMEOUT", "10"))


def _http_to_ws(base: str) -> str:
    if base.startswith("https://"):
        return "wss://" + base[len("https://") :]
    if base.startswith("http://"):
        return "ws://" + base[len("http://") :]
    return base


async def wait_until_ready(timeout: float = PERSONALIVE_BOOT_TIMEOUT) -> bool:
    """Attend que le serveur PersonaLive reponde (modele charge en VRAM).

    On interroge GET /api/queue (route legere exposee par inference_online.py).
    Renvoie True des qu'il repond 200, False si le delai est depasse.
    """
    deadline = asyncio.get_event_loop().time() + timeout
    url = f"{PERSONALIVE_URL}/api/queue"
    async with aiohttp.ClientSession() as session:
        while asyncio.get_event_loop().time() < deadline:
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        return True
            except Exception:  # noqa: BLE001  (serveur pas encore up)
                pass
            await asyncio.sleep(2)
    return False


async def _fetch_reference_bytes(session: aiohttp.ClientSession, urls: list[str]) -> bytes | None:
    """Telecharge la 1re photo de reference exploitable (non vide)."""
    for url in urls:
        try:
            async with session.get(
                url, timeout=aiohttp.ClientTimeout(total=REF_FETCH_TIMEOUT)
            ) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    if data:
                        return data
        except Exception as e:  # noqa: BLE001
            print(f"[personalive] reference KO {url}: {e}", flush=True)
    return None


async def _set_reference(session: aiohttp.ClientSession, image_bytes: bytes) -> bool:
    """Envoie le portrait de reference a PersonaLive (fuse_reference)."""
    # On remet le pipeline a zero avant de fusionner une nouvelle reference.
    try:
        await session.post(
            f"{PERSONALIVE_URL}/api/reset", timeout=aiohttp.ClientTimeout(total=15)
        )
    except Exception:  # noqa: BLE001  (reset best-effort)
        pass

    form = aiohttp.FormData()
    form.add_field("ref_image", image_bytes, filename="reference.jpg", content_type="image/jpeg")
    try:
        async with session.post(
            f"{PERSONALIVE_URL}/api/upload_reference_image",
            data=form,
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            return resp.status == 200
    except Exception as e:  # noqa: BLE001
        print(f"[personalive] upload_reference_image KO: {e}", flush=True)
        return False


async def run_personalive_session(client_ws, references: list[str], send_json) -> None:
    """Gere une session ChapCam complete via PersonaLive.

    Parametres
    ----------
    client_ws : la WebSocket du navigateur (cote server.py).
    references : URLs des photos persona (1 a 4). On utilise la 1re exploitable.
    send_json : coroutine helper(server.py) pour envoyer un message JSON au client.

    Le pont :
      1. telecharge la reference et la fusionne dans PersonaLive,
      2. ouvre la WS PersonaLive,
      3. signale {"type":"ready"} au navigateur,
      4. relaie les frames dans les deux sens jusqu'a deconnexion.
    """
    ws_base = _http_to_ws(PERSONALIVE_URL)
    pl_user = str(uuid.uuid4())  # PersonaLive attend un UUID dans /api/ws/{user_id}

    async with aiohttp.ClientSession() as http:
        # 1) Reference (portrait a animer)
        ref_bytes = await _fetch_reference_bytes(http, references)
        if ref_bytes is None:
            await send_json(client_ws, {"type": "error", "message": "Photo de reference introuvable ou vide."})
            return

        if not await _set_reference(http, ref_bytes):
            await send_json(
                client_ws,
                {"type": "error", "message": "PersonaLive n'a pas pu charger la photo de reference."},
            )
            return

        # 2) Connexion WebSocket PersonaLive
        pl_url = f"{ws_base}/api/ws/{pl_user}"
        try:
            pl_ws = await websockets.connect(pl_url, max_size=16 * 1024 * 1024, open_timeout=30)
        except Exception as e:  # noqa: BLE001
            print(f"[personalive] connexion WS KO ({pl_url}): {e}", flush=True)
            await send_json(client_ws, {"type": "error", "message": "Moteur PersonaLive injoignable."})
            return

        # 3) On amorce le flux cote PersonaLive puis on signale "pret" au navigateur.
        try:
            await pl_ws.send(json.dumps({"status": "resume"}))
        except Exception:  # noqa: BLE001
            pass
        await send_json(client_ws, {"type": "ready"})
        print(f"[personalive] session active pl_user={pl_user}", flush=True)

        stop = asyncio.Event()

        # --- Regulation temps reel -------------------------------------------
        # Probleme observe : en relayant 1 frame entrante -> 1 frame PersonaLive
        # sans aucun controle, le moindre ralentissement fait s'accumuler les
        # frames (backpressure) -> latence qui grimpe -> gel, alors que le GPU
        # reste sous-utilise (il attend des frames cadencees).
        #
        # Solution :
        #   1) On ne conserve QUE la frame la plus recente (slot unique). Toute
        #      frame plus ancienne non encore envoyee est ECRASEE -> drop
        #      intelligent, aucune file qui gonfle.
        #   2) On limite le nombre de frames "en vol" vers PersonaLive
        #      (MAX_IN_FLIGHT). On n'envoie une nouvelle frame que lorsque le
        #      GPU a de la place -> on le garde alimente sans creer de retard.
        #   3) Garde-fou : PersonaLive (diffusion) ne renvoie pas forcement 1
        #      sortie par entree. Si aucun retour n'arrive en FEED_TIMEOUT, on
        #      debloque l'envoi pour ne jamais figer le flux.
        MAX_IN_FLIGHT = max(1, int(os.getenv("PERSONALIVE_MAX_IN_FLIGHT", "2")))
        FEED_TIMEOUT = float(os.getenv("PERSONALIVE_FEED_TIMEOUT", "1.0"))

        cond = asyncio.Condition()
        state = {"latest": None, "in_flight": 0}

        async def uplink() -> None:
            """Navigateur -> slot 'derniere frame' (drop des frames perimees)."""
            try:
                async for message in client_ws:
                    if isinstance(message, (bytes, bytearray)):
                        if message:
                            async with cond:
                                # Ecrase la frame precedente non envoyee : on ne
                                # garde jamais que la plus fraiche.
                                state["latest"] = bytes(message)
                                cond.notify_all()
                    else:
                        # Message de controle texte (ex: {"type":"stop"}).
                        try:
                            ctrl = json.loads(message)
                            if ctrl.get("type") == "stop":
                                break
                        except Exception:  # noqa: BLE001
                            pass
            except Exception:  # noqa: BLE001  (deconnexion client)
                pass
            finally:
                stop.set()
                async with cond:
                    cond.notify_all()

        async def feeder() -> None:
            """Slot -> PersonaLive, cadence par MAX_IN_FLIGHT (anti-accumulation)."""
            try:
                while not stop.is_set():
                    async with cond:
                        # Attend : une frame dispo ET de la place cote GPU.
                        try:
                            await asyncio.wait_for(
                                cond.wait_for(
                                    lambda: stop.is_set()
                                    or (
                                        state["latest"] is not None
                                        and state["in_flight"] < MAX_IN_FLIGHT
                                    )
                                ),
                                timeout=FEED_TIMEOUT,
                            )
                        except asyncio.TimeoutError:
                            # Garde-fou : on a attendu un retour qui n'est pas
                            # venu -> on libere une place pour ne pas figer.
                            if state["in_flight"] > 0:
                                state["in_flight"] -= 1
                            continue
                        if stop.is_set():
                            return
                        if state["latest"] is None or state["in_flight"] >= MAX_IN_FLIGHT:
                            continue
                        frame = state["latest"]
                        state["latest"] = None  # consommee -> les suivantes ecraseront
                        state["in_flight"] += 1
                    await pl_ws.send(frame)
            except Exception:  # noqa: BLE001
                pass
            finally:
                stop.set()

        async def downlink() -> None:
            """PersonaLive -> Navigateur (frames generees JPEG)."""
            try:
                async for frame in pl_ws:
                    if isinstance(frame, (bytes, bytearray)):
                        if frame:
                            # Une sortie est arrivee -> on libere une place.
                            async with cond:
                                if state["in_flight"] > 0:
                                    state["in_flight"] -= 1
                                cond.notify_all()
                            await client_ws.send(bytes(frame))
                    # Les messages texte de PersonaLive (status...) sont ignores :
                    # la cadence est deja geree par MAX_IN_FLIGHT cote feeder.
            except Exception:  # noqa: BLE001  (PersonaLive ferme la WS)
                pass
            finally:
                stop.set()
                async with cond:
                    cond.notify_all()

        up = asyncio.create_task(uplink())
        feed = asyncio.create_task(feeder())
        down = asyncio.create_task(downlink())
        try:
            await stop.wait()
        finally:
            for task in (up, feed, down):
                task.cancel()
            await asyncio.gather(up, feed, down, return_exceptions=True)
            try:
                await pl_ws.close()
            except Exception:  # noqa: BLE001
                pass
            print(f"[personalive] session terminee pl_user={pl_user}", flush=True)
