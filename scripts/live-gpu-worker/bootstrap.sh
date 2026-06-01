#!/usr/bin/env bash
# ChapCam Live - bootstrap d'un worker GPU sur un Pod RunPod (repo prive).
#
# A COLLER dans le terminal web du Pod (onglet "Connect" > "Start Web Terminal").
# Il clone le repo, installe les dependances, telecharge les modeles, puis lance
# le superviseur (worker + tunnel Cloudflare + reconnexion/redemarrage auto).
#
# Usage (une seule ligne a adapter, puis coller le bloc) :
#
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
#   export LIVE_GPU_SHARED_SECRET=ton_secret_partage
#   curl -fsSL "https://raw.githubusercontent.com/meryl225/chapcam-kz/main/scripts/live-gpu-worker/bootstrap.sh" | bash
#
# (ou, si tu colles ce fichier a la main : bash bootstrap.sh)
#
# Variables :
#   GITHUB_TOKEN            (obligatoire) token GitHub avec acces lecture au repo prive
#   LIVE_GPU_SHARED_SECRET  (obligatoire) MEME valeur que sur Vercel
#   GITHUB_REPO             (defaut: meryl225/chapcam-kz)
#   GITHUB_BRANCH           (defaut: main)
#   CHAPCAM_MAX_CONCURRENT  (defaut: 4) sessions GPU simultanees par 5090
#   CHAPCAM_MAX_QUEUE       (defaut: 25) taille max de la file d'attente

set -euo pipefail

REPO="${GITHUB_REPO:-meryl225/chapcam-kz}"
BRANCH="${GITHUB_BRANCH:-main}"
WORKDIR="${CHAPCAM_WORKDIR:-/workspace/chapcam-kz}"
SUBDIR="scripts/live-gpu-worker"

log() { echo -e "[bootstrap] $*"; }
fail() { echo -e "[bootstrap] ERREUR : $*" >&2; exit 1; }

# --- 1. Verifications ---------------------------------------------------------
[ -n "${GITHUB_TOKEN:-}" ] || fail "GITHUB_TOKEN n'est pas defini (token GitHub lecture seule)."
[ -n "${LIVE_GPU_SHARED_SECRET:-}" ] || fail "LIVE_GPU_SHARED_SECRET n'est pas defini (meme valeur que sur Vercel)."

export DEBIAN_FRONTEND=noninteractive

# --- 2. Outils de base (git, curl) -------------------------------------------
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  log "Installation de git/curl..."
  (apt-get update -y && apt-get install -y --no-install-recommends git curl ca-certificates) \
    || log "Avertissement : apt indisponible, on suppose git/curl deja presents."
fi

# --- 3. Clone ou mise a jour du repo (sans laisser le token sur disque) -------
AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
if [ -d "$WORKDIR/.git" ]; then
  log "Repo deja present, mise a jour ($BRANCH)..."
  git -C "$WORKDIR" remote set-url origin "$AUTH_URL"
  git -C "$WORKDIR" fetch --depth 1 origin "$BRANCH"
  git -C "$WORKDIR" checkout -f "$BRANCH"
  git -C "$WORKDIR" reset --hard "origin/$BRANCH"
else
  log "Clone de $REPO ($BRANCH)..."
  git clone --depth 1 --branch "$BRANCH" "$AUTH_URL" "$WORKDIR" \
    || fail "Clone impossible. Verifie le token GitHub et l'acces au repo."
fi
# Ne pas laisser le token dans la config git du pod
git -C "$WORKDIR" remote set-url origin "https://github.com/${REPO}.git"

cd "$WORKDIR/$SUBDIR" || fail "Dossier $SUBDIR introuvable dans le repo."

# --- 4. Dependances Python ----------------------------------------------------
PYBIN="$(command -v python3 || command -v python)"
[ -n "$PYBIN" ] || fail "Python introuvable sur le pod."
log "Installation des dependances Python (peut prendre quelques minutes)..."
"$PYBIN" -m pip install --no-cache-dir --upgrade pip >/dev/null 2>&1 || true
"$PYBIN" -m pip install --no-cache-dir -r requirements.txt \
  || fail "Echec d'installation des dependances (requirements.txt)."

# --- 5. Telechargement des modeles -------------------------------------------
log "Telechargement des modeles IA (buffalo_l + inswapper_128)..."
"$PYBIN" download_models.py || fail "Echec du telechargement des modeles."

# --- 6. Lancement du superviseur ---------------------------------------------
chmod +x supervisor.sh server.py 2>/dev/null || true
export CHAPCAM_MAX_CONCURRENT="${CHAPCAM_MAX_CONCURRENT:-4}"
export CHAPCAM_MAX_QUEUE="${CHAPCAM_MAX_QUEUE:-25}"

log "Tout est pret. Demarrage du superviseur (worker + tunnel + watchdog)..."
log "Laisse cette session ouverte, ou relance ce bootstrap au redemarrage du pod."
echo "=================================================================="
exec bash supervisor.sh
