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

export const asset = (path) => ({ uri: `https://chapcam.com${path}` })

export const CATEGORIES = [
  { key: 'all', label: 'Tous' },
  { key: 'video', label: 'Vidéo' },
  { key: 'image', label: 'Image' },
  { key: 'audio', label: 'Audio' },
  { key: 'face', label: 'Visage' },
]

export const TOOLS = [
  { key: 'live', title: 'Live Swap', copy: 'Change de visage en temps réel', image: '/swap/face-transformed.png', live: true, categories: ['video', 'face'] },
  { key: 'genjutsu', title: 'Genjutsu', copy: 'Anime tes images avec un mouvement naturel', image: '/images/hero/avatars/a2.png', categories: ['image', 'video'] },
  { key: 'motion', title: 'Motion Control', copy: 'Anime ta photo en 3D', image: '/swap/poster-motion.png', categories: ['image', 'video'] },
  { key: 'translate', title: 'Traduction vidéo', copy: 'Traduis ta vidéo en 180+ langues', image: '/swap/poster-video-translation.png', categories: ['video', 'audio'] },
  { key: 'voice', title: 'Message Vocal', copy: 'Crée des voix réalistes depuis un texte', image: '/swap/poster-message-vocal.png', categories: ['audio'] },
  { key: 'verify', title: 'ChapVerify', copy: 'Détecte les deepfakes', image: '/swap/poster-chapverify.png', categories: ['video', 'image', 'face'] },
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
