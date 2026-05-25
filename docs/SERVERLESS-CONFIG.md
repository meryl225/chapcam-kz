# Configuration Serverless - ChapCam

## Architecture Pay-Per-Use

ChapCam utilise une architecture serverless qui te facture **uniquement quand les utilisateurs utilisent les services**.

### 1. Decart Lucy 2.1 (Face Swap AI)
- **Deja pay-per-use** via leur API
- Facture par seconde de traitement
- Scale automatiquement
- Aucune configuration supplementaire requise

### 2. LiveKit Cloud (Streaming temps reel)
- **Pay-per-minute** de streaming
- Scale from zero automatiquement
- Configuration requise:

```env
LIVEKIT_API_KEY=votre_api_key
LIVEKIT_API_SECRET=votre_api_secret
LIVEKIT_WS_URL=wss://chapcam.livekit.cloud
```

**Obtenir les credentials:**
1. Creer un compte sur https://cloud.livekit.io
2. Creer un projet "ChapCam"
3. Copier API Key et Secret

### 3. RunPod Serverless (GPU AI - Optionnel)
- **Pay-per-second** de GPU
- Scale to zero quand inactif (0$ de frais)
- Spin up en 250ms quand necessaire

```env
RUNPOD_API_KEY=votre_api_key
RUNPOD_SERVERLESS_ID=votre_endpoint_id
```

**Configuration RunPod:**
1. Aller sur https://console.runpod.io/serverless
2. Cliquer "Get started +"
3. Choisir le template "Custom" ou un template AI
4. Configurer:
   - GPU Type: RTX 4090 (recommande) ou RTX 3090
   - Min Workers: 0 (scale to zero)
   - Max Workers: 10 (selon ta capacite)
   - Idle Timeout: 5 secondes
   - Flash Boot: Active (demarrage rapide)
5. Copier l'Endpoint ID

## Variables d'environnement a ajouter

```env
# Decart (deja configure)
DECART_API_KEY=votre_decart_key

# LiveKit Cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_WS_URL=wss://chapcam.livekit.cloud

# RunPod Serverless (optionnel)
RUNPOD_API_KEY=
RUNPOD_SERVERLESS_ID=
```

## Estimation des couts

| Service | Cout | Quand facture |
|---------|------|---------------|
| Decart Lucy | ~$0.01/min | Pendant le swap |
| LiveKit | ~$0.004/min | Pendant le streaming |
| RunPod | ~$0.00031/sec (RTX 4090) | GPU actif uniquement |

**Total estime:** ~$0.02/minute par utilisateur actif

## Test de la configuration

```bash
# Verifier RunPod
curl https://chapcam.com/api/runpod/serverless

# Verifier LiveKit
curl -X POST https://chapcam.com/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","participantName":"test"}'
```
