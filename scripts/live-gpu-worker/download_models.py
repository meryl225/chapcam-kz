"""
Telecharge les modeles necessaires au face swap dans CHAPCAM_MODEL_ROOT (./models).

- buffalo_l        : pack de detection/embedding InsightFace (auto via FaceAnalysis)
- inswapper_128    : modele de swap (ONNX)

Usage :
    python download_models.py
"""

from __future__ import annotations

import os
import sys
import urllib.request

MODEL_ROOT = os.getenv("CHAPCAM_MODEL_ROOT", "./models")

# Miroirs publics connus pour inswapper_128.onnx. Le premier qui repond gagne.
INSWAPPER_URLS = [
    "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
    "https://huggingface.co/deepinsight/inswapper/resolve/main/inswapper_128.onnx",
]


def _download(url: str, dest: str) -> bool:
    try:
        print(f"[models] Telechargement depuis {url}")

        def _progress(block, block_size, total):
            if total > 0:
                pct = min(100, block * block_size * 100 // total)
                sys.stdout.write(f"\r[models] {pct}%")
                sys.stdout.flush()

        urllib.request.urlretrieve(url, dest, _progress)
        sys.stdout.write("\n")
        return os.path.exists(dest) and os.path.getsize(dest) > 100_000
    except Exception as e:  # noqa: BLE001
        print(f"\n[models] Echec : {e}")
        return False


def main() -> int:
    os.makedirs(MODEL_ROOT, exist_ok=True)

    # 1) inswapper_128.onnx
    swapper = os.path.join(MODEL_ROOT, "inswapper_128.onnx")
    if os.path.exists(swapper) and os.path.getsize(swapper) > 100_000:
        print(f"[models] inswapper_128.onnx deja present ({swapper})")
    else:
        ok = False
        for url in INSWAPPER_URLS:
            if _download(url, swapper):
                ok = True
                break
        if not ok:
            print(
                "[models] Impossible de telecharger inswapper_128.onnx automatiquement.\n"
                "         Telechargez-le manuellement et placez-le dans "
                f"{os.path.abspath(swapper)}"
            )
            return 1

    # 2) buffalo_l : declenche le telechargement auto par InsightFace
    try:
        from insightface.app import FaceAnalysis

        print("[models] Preparation de buffalo_l (detection/embedding)...")
        app = FaceAnalysis(name="buffalo_l", root=MODEL_ROOT)
        app.prepare(ctx_id=-1, det_size=(320, 320))  # ctx_id=-1 : CPU, juste pour telecharger
        print("[models] buffalo_l pret.")
    except Exception as e:  # noqa: BLE001
        print(f"[models] Avertissement buffalo_l : {e}")

    print("[models] Termine.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
