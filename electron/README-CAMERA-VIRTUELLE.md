# ChapCam — Caméra virtuelle Windows « ChapCam Camera »

Ce document explique comment fonctionne la caméra virtuelle, comment construire
l'installeur Windows, et comment signer le pilote pour qu'il apparaisse dans
**OBS, Zoom, Discord, Microsoft Teams et Google Meet**.

---

## 1. Pourquoi un pilote est obligatoire

Un périphérique caméra système ne peut **pas** être créé par une application web
ni par du simple JavaScript. Windows expose les caméras via deux API :

| API | Applications qui l'utilisent |
|-----|------------------------------|
| **DirectShow** | OBS (Périphérique de capture vidéo), Zoom, Discord, Chrome/Edge → **Google Meet** |
| **Media Foundation** | **Microsoft Teams**, application Caméra de Windows |

ChapCam embarque le pilote open-source **akvirtualcamera** (GPLv3) qui implémente
**les deux** API. C'est lui qui fait apparaître le périphérique nommé
**« ChapCam Camera »** partout. L'application ChapCam ne fait « que » :

1. transformer le visage (déjà en place dans l'app web),
2. capturer la sortie transformée (canvas/vidéo `[data-chapcam-output]`),
3. pousser chaque frame dans le pilote.

---

## 2. Flux technique

```
Page web ChapCam
  └─ <canvas data-chapcam-output>  (sortie face-swap transformée)
        │  (preload.js : capture 30 fps, lecture des vrais pixels)
        ▼
   ipcRenderer.send('vcam:frame', {width,height,buffer})
        ▼
   main.js  ──►  virtual-camera.js  (RGBA → RGB24, swap R/B, flip V)
        │
        ▼  stdin
   AkVCamManager.exe stream ChapCamCamera RGB24 1280 720
        ▼
   Pilote « ChapCam Camera »  ──►  OBS / Zoom / Discord / Teams / Meet
```

Aucune capture de fenêtre, aucun recadrage : les applications tierces
sélectionnent directement « ChapCam Camera » dans leur liste de périphériques.

---

## 3. Mettre en place le binaire du pilote

Le dépôt ne contient pas les binaires (licence + signature). Récupère
akvirtualcamera puis place les fichiers ainsi (voir aussi
`resources/akvirtualcamera/PLACER-LE-PILOTE-ICI.txt`) :

```
resources/akvirtualcamera/
  x64/
    AkVCamManager.exe
    AkVirtualCamera.plugin/   (DLL DirectShow + Media Foundation)
  x86/
    AkVCamManager.exe
    AkVirtualCamera.plugin/
  install-driver.bat
  uninstall-driver.bat
```

- Source officielle : projet **akvirtualcamera** (webcamoid).
- `AkVCamManager.exe` est la CLI utilisée par `virtual-camera.js`
  (`devices`, `add-device`, `set-description`, `add-format`, `update`, `stream`).

---

## 4. Construire l'installeur Windows

> À exécuter **sur une machine Windows** (le pilote est natif Windows ; il ne
> peut pas être compilé ni testé sous Linux/macOS).

```bash
# 1. Dépendances
npm install

# 2. Build Next.js + packaging Electron (config : electron-builder.yml)
npm run electron:build:win
```

L'installeur `ChapCam-Setup-<version>.exe` est généré dans `dist/`.
Il demande les **droits administrateur** (obligatoire pour installer un pilote)
et, via `electron/build/installer.nsh`, exécute :

- à l'installation → `resources/akvirtualcamera/install-driver.bat`
  (enregistre DirectShow + Media Foundation, crée « ChapCam Camera ») ;
- à la désinstallation → `uninstall-driver.bat` (retire le périphérique).

---

## 5. Signature du pilote (indispensable en production)

Windows 10/11 refuse de charger un pilote/filtre non signé pour certaines
applications (et SmartScreen bloque l'installeur). Pour une diffusion publique :

1. **Certificat de signature de code** (OV ou EV ; EV recommandé pour éviter la
   période de réputation SmartScreen).
2. Signer les binaires du pilote **et** l'installeur :

```bat
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 ^
  resources\akvirtualcamera\x64\AkVirtualCamera.plugin\*.dll
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 ^
  dist\ChapCam-Setup-<version>.exe
```

3. electron-builder peut signer automatiquement l'app si tu renseignes les
   variables `CSC_LINK` (chemin du .pfx) et `CSC_KEY_PASSWORD` avant le build.

> Le filtre DirectShow n'exige pas de signature noyau (c'est un COM en
> espace utilisateur), mais la signature Authenticode reste nécessaire pour la
> confiance et pour Media Foundation/Teams.

---

## 6. Vérifier après installation

1. Ouvrir l'app **Caméra** de Windows → choisir « ChapCam Camera ».
2. **OBS** → Source « Périphérique de capture vidéo » → « ChapCam Camera ».
3. **Zoom / Teams / Discord / Google Meet** → Paramètres vidéo → « ChapCam Camera ».
4. Lancer un swap dans ChapCam : l'image transformée doit apparaître en direct.

### Réglages si l'image est anormale (1er test)
Dans `electron/virtual-camera.js`, en haut du fichier :

- couleurs inversées (visage bleu) → mettre `SWAP_RB = false` ;
- image à l'envers → mettre `FLIP_V = false`.

---

## 7. Limites connues

- **macOS** : akvirtualcamera fournit aussi un pilote CMIO, mais le streaming
  n'est pas encore câblé (`startMacOS` lève une erreur explicite).
- **Linux** : supporté via `v4l2loopback` + ffmpeg (utile pour le développement,
  `card_label="ChapCam Camera"`).
- Le débit est plafonné à `VCAM.fps` (30 par défaut) ; les frames en surnombre
  sont droppées pour préserver la latence.
