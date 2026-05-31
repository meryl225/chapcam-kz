# ChapCam Live - Worker GPU (le "2e logiciel")

Moteur de **face swap temps reel** qui alimente l'offre **Live Pro**.
Memes briques techniques que les outils "pro" : **InsightFace** (detection +
embedding `buffalo_l`) + **inswapper_128** sur **ONNX Runtime GPU**, avec
acceleration **TensorRT** optionnelle.

Il existe **deux modes**, qui partagent le meme moteur (`engine.py`) :

| Mode | Fichier | Pour qui | Latence |
|------|---------|----------|---------|
| **Cloud** | `server.py` | Tous les clients, rien a installer (100% navigateur) | ~80-200 ms (reseau inclus) |
| **Local** | `local_app.py` | Utilisateurs avances avec GPU NVIDIA | **~20-40 ms** (vrai temps reel) |

---

## 1. Mode Cloud (`server.py`)

Branche a l'app Next.js. Le navigateur envoie les frames webcam, le worker
renvoie les frames "swappees".

### Lancer en local (test)

```bash
pip install -r requirements.txt
python download_models.py
export LIVE_GPU_SHARED_SECRET="le-meme-secret-que-next"
python server.py
# -> ws://localhost:8765
```

### Deployer avec Docker (n'importe quel fournisseur GPU)

```bash
docker build -t chapcam-gpu .
docker run --gpus all -p 8765:8765 \
  -e LIVE_GPU_SHARED_SECRET="le-meme-secret-que-next" \
  -e CHAPCAM_MAX_CONCURRENT=2 \
  chapcam-gpu
```

Fonctionne sur **Vast.ai, Lambda, RunPod, Paperspace, un serveur perso**, etc.
Il faut exposer le port en **WSS** (TLS) derriere un reverse proxy
(Caddy/Nginx/Traefik), car le navigateur exige `wss://` quand le site est en HTTPS.

### Brancher dans l'app Next.js

Definir ces variables d'environnement cote Vercel :

```
LIVE_GPU_WS_URL=wss://gpu.tondomaine.com         # ou wss://.../ws selon ton proxy
LIVE_GPU_SHARED_SECRET=le-meme-secret-que-le-worker
```

> Le secret **doit etre identique** des deux cotes : l'app signe un token HMAC
> `userId.exp.hmac`, le worker le verifie (`auth.py`). Ne committez jamais ce
> secret dans le depot.

---

## 2. Mode Local (`local_app.py`) - vrai ~30 ms

Tourne sur le GPU du client : **webcam -> swap -> camera virtuelle** "ChapCam"
utilisable dans Zoom / Meet / Discord / OBS. Aucune latence reseau.

```bash
pip install -r requirements-local.txt
python download_models.py
python local_app.py --personas mon_persona.jpg --preview
```

Prerequis camera virtuelle :
- **Windows / macOS** : installer **OBS** (fournit la "OBS Virtual Camera").
- **Linux** : `sudo modprobe v4l2loopback`.

Puis dans Zoom/Meet/Discord, choisir la camera **"OBS Virtual Camera"** / "ChapCam".

---

## 3. File d'attente (queue)

Le worker n'accepte que `CHAPCAM_MAX_CONCURRENT` sessions simultanees (selon la
VRAM). Au-dela, les nouveaux arrivants sont **mis en file d'attente** et recoivent
leur **position en temps reel** :

```json
{ "type": "queue", "position": 2, "total": 5 }
```

Priorite : les sessions **payantes** passent devant les **essais gratuits**.
Des qu'un slot se libere, le worker envoie `{"type":"ready"}` et le swap demarre.

---

## 4. Optimiser la latence facon "pro"

1. **TensorRT** (`CHAPCAM_USE_TRT=1`) : compile un moteur FP16 optimise au 1er
   lancement (cache sur disque). Gain majeur sur l'inference.
2. **`CHAPCAM_DET_SIZE=320`** (ou 256) : la detection est le plus gros cout ;
   reduire la taille accelere beaucoup pour une perte de precision minime.
3. **`CHAPCAM_REDETECT_EVERY=8`** : tracking - on ne redetecte le visage que
   toutes les 8 frames et on reutilise la bbox entre-temps.
4. **GPU dedie** dans une region reseau proche de tes utilisateurs (reduit le RTT).
5. Garder un **pod persistant** (pas de cold start) et `CHAPCAM_MAX_CONCURRENT`
   adapte a la VRAM pour eviter la contention.

---

## 5. Protocole WebSocket (resume)

1. Connexion : `wss://<host>/?token=<userId.exp.hmac>` -> le worker valide le HMAC.
2. Client -> `{"type":"config","references":["url1", ...]}` (1 a 4 URLs de photos).
3. (si file) Worker -> `{"type":"queue","position":N,"total":M}` (repete).
4. Worker -> `{"type":"ready"}`.
5. Client -> frames **JPEG binaires** (webcam).
6. Worker -> frames **JPEG binaires** (visage swappe).
7. En cas de souci : Worker -> `{"type":"error","message":"..."}`.

---

## Fichiers

| Fichier | Role |
|---------|------|
| `engine.py` | Moteur de swap partage (InsightFace + inswapper + ONNX/TensorRT) |
| `server.py` | Serveur WebSocket cloud + file d'attente + auth token |
| `local_app.py` | App locale webcam -> camera virtuelle |
| `queue_manager.py` | File d'attente GPU avec priorite payant > essai |
| `auth.py` | Verification du token HMAC emis par Next.js |
| `download_models.py` | Telechargement des modeles (inswapper + buffalo_l) |
| `Dockerfile` | Image GPU pour le mode cloud |
| `.env.example` | Variables d'environnement du worker |
