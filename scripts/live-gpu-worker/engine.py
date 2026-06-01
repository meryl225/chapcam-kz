"""
ChapCam Live - Moteur de Face Swap temps reel (le "2e logiciel").

Stack : InsightFace (buffalo_l pour la detection/embedding) + inswapper_128.onnx
        sur ONNX Runtime GPU, avec acceleration TensorRT si disponible.

C'est la meme base technique que les outils "pro" (Deep-Live-Cam, Roop, etc.).
Le moteur est partage entre :
  - server.py    -> mode cloud (WebSocket, plusieurs clients, file d'attente GPU)
  - local_app.py -> mode local (webcam -> camera virtuelle, vrai ~30 ms sur GPU client)

Optimisations basse latence :
  - Providers TensorRT / CUDA avec FP16
  - det_size reduit (la detection est le plus gros cout)
  - Tracking : on ne relance la detection que toutes les N frames, on reutilise
    la derniere bbox entre-temps (le visage bouge peu d'une frame a l'autre)
  - Le visage source (persona) est prepare UNE seule fois a la configuration
"""

from __future__ import annotations

import os
import time
import threading
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np


# ------------------------------------------------------------------
# Selection des providers ONNX Runtime (du plus rapide au plus lent)
# ------------------------------------------------------------------
def _select_providers() -> list:
    try:
        import onnxruntime as ort
    except Exception:  # pragma: no cover
        return ["CPUExecutionProvider"]

    available = ort.get_available_providers()
    providers: list = []

    # TensorRT : le plus rapide, compile un moteur optimise (cache sur disque)
    if "TensorrtExecutionProvider" in available and os.getenv("CHAPCAM_USE_TRT", "1") == "1":
        cache_dir = os.getenv("CHAPCAM_TRT_CACHE", "/tmp/chapcam-trt-cache")
        os.makedirs(cache_dir, exist_ok=True)
        providers.append(
            (
                "TensorrtExecutionProvider",
                {
                    "trt_fp16_enable": True,
                    "trt_engine_cache_enable": True,
                    "trt_engine_cache_path": cache_dir,
                    "trt_timing_cache_enable": True,
                    "trt_max_workspace_size": 2 << 30,  # 2 Go
                },
            )
        )

    # CUDA : tres rapide, fallback naturel de TensorRT
    if "CUDAExecutionProvider" in available:
        providers.append(
            (
                "CUDAExecutionProvider",
                {
                    "cudnn_conv_algo_search": "EXHAUSTIVE",
                    "do_copy_in_default_stream": True,
                },
            )
        )

    providers.append("CPUExecutionProvider")
    return providers


@dataclass
class _Track:
    """Etat de suivi d'un visage pour eviter de redetecter a chaque frame."""

    face: object = None
    last_detect_ts: float = 0.0
    frames_since_detect: int = 10_000


@dataclass
class SwapEngine:
    """Moteur de face swap reutilisable. Thread-safe pour l'inference."""

    model_root: str = field(default_factory=lambda: os.getenv("CHAPCAM_MODEL_ROOT", "./models"))
    det_size: int = field(default_factory=lambda: int(os.getenv("CHAPCAM_DET_SIZE", "384")))
    # Redetection a CHAQUE frame par defaut : c'est ce qui evite la deformation
    # du swap quand le visage bouge. Avant (8) on reutilisait des points de
    # visage perimes entre deux detections -> le visage source etait plaque sur
    # une position obsolete (etirement/glissement). Mettre 2 si besoin de FPS.
    redetect_every: int = field(default_factory=lambda: int(os.getenv("CHAPCAM_REDETECT_EVERY", "1")))

    _analyser: object = field(default=None, init=False)
    _swapper: object = field(default=None, init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False)
    _ready: bool = field(default=False, init=False)

    # ----- Initialisation (chargee une fois au demarrage du process) -----
    def load(self) -> None:
        if self._ready:
            return
        from insightface.app import FaceAnalysis
        from insightface.model_zoo import get_model

        providers = _select_providers()
        print(f"[engine] Providers ONNX : {[p[0] if isinstance(p, tuple) else p for p in providers]}")

        # Detection + embedding (buffalo_l)
        self._analyser = FaceAnalysis(name="buffalo_l", root=self.model_root, providers=providers)
        self._analyser.prepare(ctx_id=0, det_size=(self.det_size, self.det_size))

        # Modele de swap (inswapper_128)
        swapper_path = os.path.join(self.model_root, "inswapper_128.onnx")
        if not os.path.exists(swapper_path):
            raise FileNotFoundError(
                f"Modele de swap introuvable : {swapper_path}. Lancez download_models.py."
            )
        self._swapper = get_model(swapper_path, providers=providers)

        self._ready = True
        print("[engine] Moteur pret.")

    @property
    def ready(self) -> bool:
        return self._ready

    # ----- Preparation du visage source (persona) -----
    def build_source_face(self, image_bgr: np.ndarray):
        """Detecte le plus grand visage d'une image de reference et le renvoie."""
        with self._lock:
            faces = self._analyser.get(image_bgr)
        if not faces:
            return None
        # Le plus grand visage = persona principal
        faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
        return faces[0]

    def build_source_from_bytes(self, data: bytes):
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        return self.build_source_face(img)

    # ----- Swap d'une frame -----
    def swap_frame(
        self,
        frame_bgr: np.ndarray,
        source_face,
        track: Optional[_Track] = None,
        stats: Optional[dict] = None,
    ) -> np.ndarray:
        """Applique le visage source sur le(s) visage(s) detecte(s) dans la frame.

        Si `stats` est fourni (dict), on y ecrit les temps en ms :
          stats["detect_ms"], stats["swap_ms"], stats["detected"] (bool).
        """
        if source_face is None:
            return frame_bgr

        do_detect = True
        if track is not None:
            track.frames_since_detect += 1
            if track.face is not None and track.frames_since_detect < self.redetect_every:
                do_detect = False

        target_face = None
        if do_detect:
            t0 = time.perf_counter()
            with self._lock:
                faces = self._analyser.get(frame_bgr)
            if stats is not None:
                stats["detect_ms"] = (time.perf_counter() - t0) * 1000.0
                stats["detected"] = True
            if faces:
                faces.sort(
                    key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
                    reverse=True,
                )
                target_face = faces[0]
                if track is not None:
                    track.face = target_face
                    track.frames_since_detect = 0
                    track.last_detect_ts = time.time()
        else:
            target_face = track.face

        if target_face is None:
            return frame_bgr

        t1 = time.perf_counter()
        with self._lock:
            result = self._swapper.get(frame_bgr, target_face, source_face, paste_back=True)
        if stats is not None:
            stats["swap_ms"] = (time.perf_counter() - t1) * 1000.0
        return result

    # ----- Pipeline complet chronometre (decode -> swap -> encode) -----
    def process_jpeg(
        self,
        data: bytes,
        source_face,
        track: Optional[_Track] = None,
        quality: int = 70,
    ) -> tuple[bytes, dict]:
        """Decode un JPEG, applique le swap, re-encode. Renvoie (jpeg, stats_ms).

        Tout est fait dans UN seul appel (donc un seul saut de thread depuis
        l'event loop), ce qui reduit l'overhead par rapport a 3 appels separes.
        """
        stats: dict = {"decode_ms": 0.0, "detect_ms": 0.0, "swap_ms": 0.0, "encode_ms": 0.0, "detected": False}

        t0 = time.perf_counter()
        arr = np.frombuffer(data, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        stats["decode_ms"] = (time.perf_counter() - t0) * 1000.0
        if frame is None:
            return b"", stats

        swapped = self.swap_frame(frame, source_face, track, stats=stats)

        t2 = time.perf_counter()
        ok, buf = cv2.imencode(".jpg", swapped, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        stats["encode_ms"] = (time.perf_counter() - t2) * 1000.0
        return (buf.tobytes() if ok else b""), stats

    # ----- Helpers JPEG (cloud) -----
    def decode_jpeg(self, data: bytes) -> Optional[np.ndarray]:
        arr = np.frombuffer(data, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    def encode_jpeg(self, frame_bgr: np.ndarray, quality: int = 70) -> bytes:
        ok, buf = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        return buf.tobytes() if ok else b""


def new_track() -> _Track:
    return _Track()
