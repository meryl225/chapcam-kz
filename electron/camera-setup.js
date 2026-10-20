const VIEW = {
  missing: { tone: 'err', title: 'Composants caméra absents', action: false },
  'move-to-applications': { tone: 'warn', title: 'Déplace ChapCam dans Applications', action: false },
  'not-installed': { tone: 'warn', title: 'Caméra non activée', action: true },
  installing: { tone: 'busy', title: 'Installation en cours…', action: false },
  'needs-approval': { tone: 'warn', title: 'Autorisation macOS nécessaire', action: true, settings: true },
  disabled: { tone: 'warn', title: 'Caméra désactivée dans macOS', action: true, settings: true },
  'reboot-required': { tone: 'warn', title: 'Redémarrage nécessaire', action: false },
  activated: { tone: 'busy', title: 'Activation réussie, détection en cours…', action: true },
  ready: { tone: 'ok', title: 'ChapCam Camera est disponible', action: false },
  error: { tone: 'err', title: 'Erreur d’activation', action: true },
}

const $ = (id) => document.getElementById(id)
let busy = false

function render(state) {
  const view = VIEW[state.status] || { tone: 'err', title: state.status, action: true }
  $('status').dataset.tone = view.tone
  $('title').textContent = view.title
  $('message').textContent = state.message || ''
  $('activate').disabled = busy || !view.action
  $('activate').textContent = state.status === 'error' ? 'Réessayer' : 'Activer la caméra virtuelle'
  $('activate').hidden = state.status === 'ready'
  $('settings').hidden = !view.settings
  $('approval').hidden = !view.settings
  if (state.approvalHint) $('approval-step').textContent = state.approvalHint
  $('details').textContent = [
    `macOS ${state.macos || '?'}`,
    `App : ${state.appPath || '?'}`,
    `Extension dans l’app : ${state.bundled ? 'oui' : 'non'} · helper : ${state.helper ? 'oui' : 'non'} · activateur : ${state.activator ? 'oui' : 'non'}`,
    `Enregistrement système : ${state.registration || '—'}`,
    `Caméra visible (CoreMediaIO) : ${state.cmioVisible ?? state.deviceVisible ? 'oui' : 'non'}`,
    state.avCameras ? `Caméra visible (AVFoundation, Zoom/Telegram) : ${state.avVisible ? 'oui' : 'non'}` : '',
    state.extensionRunning !== undefined ? `Processus de l’extension actif : ${state.extensionRunning ? 'oui' : 'non'}` : '',
    state.cameraAccess ? `Autorisation caméra de ChapCam : ${state.cameraAccess}` : '',
    state.cmioDevices ? `Périphériques CoreMediaIO : ${state.cmioDevices}` : '',
    state.avCameras && state.avCameras.length ? `Caméras macOS : ${state.avCameras.join(', ')}` : '',
    state.registrationRaw ? `systemextensionsctl :\n${state.registrationRaw}` : '',
    state.logPath ? `Journal : ${state.logPath}` : '',
  ].filter(Boolean).join('\n')
}

async function refresh() {
  if (busy) return
  try {
    render(await window.cameraSetup.state())
  } catch (e) {
    render({ status: 'error', message: e.message })
  }
}

$('activate').addEventListener('click', async () => {
  busy = true
  render({ status: 'installing', message: 'macOS va afficher une demande d’autorisation.' })
  try {
    const state = await window.cameraSetup.activate()
    busy = false
    render(state)
    if (state.status === 'needs-approval' || state.status === 'disabled') window.cameraSetup.openSettings()
  } catch (e) {
    busy = false
    render({ status: 'error', message: e.message })
  }
})
$('settings').addEventListener('click', () => window.cameraSetup.openSettings())
$('log').addEventListener('click', () => window.cameraSetup.openLog())
$('close').addEventListener('click', () => window.cameraSetup.close())

refresh()
setInterval(refresh, 2000)
