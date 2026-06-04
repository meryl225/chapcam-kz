import { ImageIcon } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function PhotoVideoPage() {
  return (
    <ComingSoon
      icon={ImageIcon}
      title="Modifications Photos en Vidéo"
      description="Donnez vie à vos photos : l’IA les anime et les transforme en vidéos réalistes en quelques secondes."
      features={[
        'Animation de photos en vidéos réalistes',
        'Amélioration et retouche par IA',
        'Export en haute qualité',
        'Idéal pour les réseaux sociaux',
      ]}
      accent="#f97316"
      glow="rgba(249,115,22,0.18)"
    />
  )
}
