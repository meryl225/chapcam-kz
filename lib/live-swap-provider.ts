// Internal Live Swap provider routing. Provider names must never reach the UI:
// switch providers here (or via NEXT_PUBLIC_LIVE_SWAP_PROVIDER) without touching any screen.
export type LiveSwapProvider = 'vidu' | 'decart'

export const LIVE_SWAP_PROVIDER: LiveSwapProvider =
  process.env.NEXT_PUBLIC_LIVE_SWAP_PROVIDER === 'decart' ? 'decart' : 'vidu'

export const LIVE_SWAP_EDITING_TYPE = 'subject_replacement' as const

export const LIVE_SWAP_GENERIC_ERROR = 'Impossible de démarrer Live Swap. Veuillez réessayer.'
