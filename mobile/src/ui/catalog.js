export const C = {
  bg: '#F5F8FF',
  ink: '#0E1530',
  muted: '#7A84A0',
  line: '#E6EBF5',
  blue: '#1E6BFF',
  violet: '#7B4DFF',
  white: '#FFFFFF',
}
export const BRAND = [C.blue, C.violet]
export const PAD = 18
export const GAP = 12

export const asset = (path) => (typeof path === 'string' ? { uri: `https://chapcam.com${path}` } : path)

const LIVE_SWAP_HERO = require('../../assets/live-swap-hero.mp4')


export const CATEGORIES = [
  { key: 'all', label: 'Tous' },
  { key: 'video', label: 'Vidéo' },
  { key: 'image', label: 'Image' },
  { key: 'audio', label: 'Audio' },
  { key: 'face', label: 'Visage' },
]

// Mirrors components/dashboard/hub/tools-grid.tsx on chapcam.com.
export const TOOL_MEDIA = {
  live: { type: 'video', src: LIVE_SWAP_HERO },
  'photo-video': { type: 'image', src: '/swap/poster-photo-video.png' },
  genjutsu: { type: 'video', src: '/videos/genjutsu-demo.mov' },
  motion: { type: 'video', src: '/videos/motion-control-demo.mp4', poster: '/swap/poster-motion.png' },
  translate: { type: 'image', src: '/swap/poster-video-translation.png' },
  voice: { type: 'image', src: '/swap/poster-message-vocal.png' },
  verify: { type: 'image', src: '/swap/poster-chapverify.png' },
}

const CREATOR_1491 = require('../../assets/creator-1491.mp4')
const CREATOR_1466 = require('../../assets/creator-1466.mp4')
const CREATOR_1469 = require('../../assets/creator-1469.mp4')
const CREATOR_1475 = require('../../assets/creator-1475.mp4')
const CREATOR_1474 = require('../../assets/creator-1474.mp4')
const CREATOR_1472 = require('../../assets/creator-1472.mp4')

// Only the six videos attached for the Home "Pour toi" section.
export const CREATOR_VIDEOS = [
  ['creator-1491', CREATOR_1491],
  ['creator-1466', CREATOR_1466],
  ['creator-1469', CREATOR_1469],
  ['creator-1475', CREATOR_1475],
  ['creator-1474', CREATOR_1474],
  ['creator-1472', CREATOR_1472],
].map(([key, src]) => ({ key, media: { type: 'video', src } }))

export const TOOLS = [
  { key: 'live', title: 'Live Swap', copy: 'Change de visage en temps réel', media: TOOL_MEDIA.live, live: true, categories: ['video', 'face'] },
  { key: 'photo-video', title: 'Photos en Vidéo', copy: 'Anime ta photo en vidéo', media: TOOL_MEDIA['photo-video'], categories: ['image', 'video'] },
  { key: 'genjutsu', title: 'Genjutsu', copy: 'Anime tes images', media: TOOL_MEDIA.genjutsu, categories: ['image', 'video'] },
  { key: 'motion', title: 'Motion', copy: 'Anime ta photo en 3D', media: TOOL_MEDIA.motion, categories: ['image', 'video'] },
  { key: 'translate', title: 'Traduction de Vidéo', copy: 'Traduis ta vidéo en 190+ langues', media: TOOL_MEDIA.translate, categories: ['video', 'audio'] },
  { key: 'voice', title: 'Message Vocal', copy: 'Change ta voix ou crée-la depuis un texte', media: TOOL_MEDIA.voice, categories: ['audio'] },
  { key: 'verify', title: 'ChapVerify', copy: 'Détecte les deepfakes', media: TOOL_MEDIA.verify, categories: ['video', 'image', 'face'] },
]

export const normalize = (value) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const shadow = {
  shadowColor: '#2A3A7A',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
}
