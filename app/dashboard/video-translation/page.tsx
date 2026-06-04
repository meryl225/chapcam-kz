import { Film } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function VideoTranslationPage() {
  return (
    <ComingSoon
      icon={Film}
      title="Traduction de Vidéo"
      description="Traduisez, sous-titrez et doublez vos vidéos automatiquement dans toutes les langues, avec une voix humaine naturelle."
      features={[
        'Doublage automatique avec voix humaine',
        'Sous-titres générés et synchronisés',
        'Prise en charge de nombreuses langues',
        'Conserve le ton de la vidéo originale',
      ]}
      accent="#2563eb"
      glow="rgba(37,99,235,0.18)"
    />
  )
}
