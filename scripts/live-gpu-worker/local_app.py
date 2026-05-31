"""
ChapCam Live - Application LOCALE (vrai ~30 ms).

Tourne sur le GPU de l'utilisateur : webcam -> face swap -> CAMERA VIRTUELLE.
La camera virtuelle "ChapCam" apparait ensuite dans Zoom / Meet / OBS / Discord.

Aucune latence reseau : la seule latence est celle du GPU local (~20-40 ms
sur une RTX recente). C'est l'equivalent local des outils "pro".

Prerequis :
  - GPU NVIDIA + drivers CUDA (sinon bascule CPU, beaucoup plus lent)
  - pip install -r requirements-local.txt
  - python download_models.py   (telecharge les modeles une fois)
  - Une camera virtuelle :
      * Windows : installer OBS (fournit "OBS Virtual Camera"), ou
        installer la lib via pyvirtualcam (utilise OBS/Unity Capture).
      * macOS   : OBS Virtual Camera.
      * Linux   : v4l2loopback (sudo modprobe v4l2loopback).

Usage :
  python local_app.py --personas chemin1.jpg chemin2.jpg
  python local_app.py --personas persona.jpg --camera 0 --width 1280 --height 720
"""

from __future__ import annotations

import argparse
import sys
import time

import cv2

from engine import SwapEngine, new_track


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ChapCam Live - app locale (webcam -> camera virtuelle)")
    p.add_argument("--personas", nargs="+", required=True, help="Une a quatre photos de reference (persona).")
    p.add_argument("--camera", type=int, default=0, help="Index de la webcam (defaut 0).")
    p.add_argument("--width", type=int, default=1280)
    p.add_argument("--height", type=int, default=720)
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--preview", action="store_true", help="Afficher une fenetre de previsualisation.")
    p.add_argument(
        "--no-virtualcam",
        action="store_true",
        help="Ne pas sortir vers la camera virtuelle (preview uniquement).",
    )
    return p.parse_args()


def load_source_face(engine: SwapEngine, paths: list[str]):
    for path in paths:
        img = cv2.imread(path)
        if img is None:
            print(f"[local] Image illisible : {path}")
            continue
        face = engine.build_source_face(img)
        if face is not None:
            print(f"[local] Persona charge depuis {path}")
            return face
        print(f"[local] Aucun visage detecte sur {path}")
    return None


def main() -> int:
    args = parse_args()

    print("[local] Chargement du moteur de face swap (peut prendre 1 min au 1er lancement)...")
    engine = SwapEngine()
    engine.load()

    source_face = load_source_face(engine, args.personas)
    if source_face is None:
        print("[local] Impossible de preparer le persona. Verifiez vos photos de reference.")
        return 1

    # Webcam
    cap = cv2.VideoCapture(args.camera)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
    cap.set(cv2.CAP_PROP_FPS, args.fps)
    if not cap.isOpened():
        print(f"[local] Webcam introuvable (index {args.camera}).")
        return 1

    # Camera virtuelle (optionnelle)
    virtual = None
    if not args.no_virtualcam:
        try:
            import pyvirtualcam

            virtual = pyvirtualcam.Camera(
                width=args.width, height=args.height, fps=args.fps, fmt=pyvirtualcam.PixelFormat.BGR
            )
            print(f"[local] Camera virtuelle active : {virtual.device}")
            print("[local] Selectionnez cette camera dans Zoom/Meet/OBS/Discord.")
        except Exception as e:  # noqa: BLE001
            print(f"[local] Camera virtuelle indisponible ({e}). Mode preview seul.")
            args.preview = True

    track = new_track()
    fps_t0 = time.time()
    frames = 0
    print("[local] En direct. Ctrl+C pour quitter.")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                continue

            t0 = time.time()
            out = engine.swap_frame(frame, source_face, track)
            infer_ms = (time.time() - t0) * 1000

            if virtual is not None:
                # pyvirtualcam attend du RGB par defaut ; on a configure BGR
                virtual.send(out)
                virtual.sleep_until_next_frame()

            frames += 1
            if time.time() - fps_t0 >= 1.0:
                fps = frames / (time.time() - fps_t0)
                sys.stdout.write(f"\r[local] {fps:4.1f} fps | inference {infer_ms:5.1f} ms ")
                sys.stdout.flush()
                frames = 0
                fps_t0 = time.time()

            if args.preview:
                cv2.imshow("ChapCam Live (local)", out)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        if virtual is not None:
            virtual.close()
        cv2.destroyAllWindows()
        print("\n[local] Termine.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
