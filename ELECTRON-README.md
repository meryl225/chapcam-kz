# ChapCam Desktop

Application de bureau pour ChapCam - Face Swap en Temps Reel.

## Prerequis

- Node.js 18+
- pnpm (recommande) ou npm

## Installation

```bash
# Installer les dependances
pnpm install
```

## Developpement

```bash
# Lancer le serveur Next.js
pnpm dev

# Dans un autre terminal, lancer Electron
pnpm electron:dev
```

## Build

### macOS
```bash
pnpm electron:build:mac
```
Genere:
- `dist-electron/ChapCam-1.0.0-arm64.dmg` (Apple Silicon)
- `dist-electron/ChapCam-1.0.0-x64.dmg` (Intel)

### Windows
```bash
pnpm electron:build:win
```
Genere:
- `dist-electron/ChapCam-Setup-1.0.0.exe` (Installateur)
- `dist-electron/ChapCam-1.0.0-portable.exe` (Portable)

### Linux
```bash
pnpm electron:build:linux
```
Genere:
- `dist-electron/ChapCam-1.0.0.AppImage`
- `dist-electron/chapcam_1.0.0_amd64.deb`

## Camera Virtuelle

Pour utiliser ChapCam comme camera virtuelle dans Zoom, Teams, Google Meet, etc:

### macOS
1. Installer [OBS Studio](https://obsproject.com/)
2. Activer OBS Virtual Camera
3. Dans ChapCam, activer "Camera Virtuelle"
4. Dans Zoom/Teams, selectionner "OBS Virtual Camera"

### Windows
1. Installer [OBS Studio](https://obsproject.com/)
2. Activer OBS Virtual Camera
3. Dans ChapCam, activer "Camera Virtuelle"
4. Dans Zoom/Teams, selectionner "OBS Virtual Camera"

### Linux
```bash
# Installer v4l2loopback
sudo apt install v4l2loopback-dkms

# Creer le device virtuel
sudo modprobe v4l2loopback devices=1 video_nr=10 card_label="ChapCam"
```

## Structure

```
electron/
  main.js           # Process principal Electron
  preload.js        # Script de preload (securite)
  virtual-camera.js # Module camera virtuelle
lib/
  electron.ts       # API Electron pour le frontend
build/
  entitlements.mac.plist  # Permissions macOS
electron-builder.json     # Configuration du build
```

## Raccourcis Clavier

- `Cmd/Ctrl + Shift + V` - Activer/Desactiver camera virtuelle
- `Cmd/Ctrl + ,` - Preferences
- `Cmd/Ctrl + R` - Recharger
- `F11` - Plein ecran
- `Cmd/Ctrl + Q` - Quitter
