import { useEffect, useRef, useState } from 'react'

// expo-video's useVideoPlayer releases the native player in an effect cleanup but only creates it during render.
// Under <Activity mode="hidden"> React runs that cleanup without unmounting, so when the tab is shown again the
// component reuses an already-released native object: the next play()/pause() throws and the release build closes.
// Owning creation and release in the same effect guarantees a fresh player every time the effects come back.
export function useSafeVideoPlayer(videoModule, source, setup) {
  const [player, setPlayer] = useState(null)
  const setupRef = useRef(setup)
  setupRef.current = setup
  const sourceRef = useRef(source)
  sourceRef.current = source
  const sourceKey = JSON.stringify(source ?? null)

  useEffect(() => {
    if (!videoModule) return undefined
    let created = null
    try {
      created = videoModule.createVideoPlayer(sourceRef.current ?? null)
      setupRef.current?.(created)
    } catch (error) {
      console.warn('[video] player creation failed', error?.message)
      try { created?.release() } catch {}
      return undefined
    }
    setPlayer(created)
    return () => {
      setPlayer((current) => (current === created ? null : current))
      try { created.pause() } catch {}
      try { created.release() } catch {}
    }
  }, [videoModule, sourceKey])

  return player
}

// expo-video and expo-audio players are native shared objects: once released (screen closed, source
// swapped, tab hidden) any method call throws synchronously, which inside an onPress closes the release app.
export function callPlayer(player, method, ...args) {
  if (!player) return undefined
  try {
    return player[method](...args)
  } catch (error) {
    console.warn(`[player] ${method} failed`, error?.message)
    return undefined
  }
}

export function setPlayerPlaying(player, playing) {
  if (!player) return
  try {
    if (playing) player.play()
    else player.pause()
  } catch (error) {
    console.warn('[video] play state change failed', error?.message)
  }
}
