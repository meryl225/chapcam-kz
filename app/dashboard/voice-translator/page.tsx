import { Languages } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function VoiceTranslatorPage() {
  return (
    <ComingSoon
      icon={Languages}
      title="Voice Changer Traducteur"
      description="Parlez dans votre langue et soyez entendu dans une autre, en direct, avec une vraie voix humaine. Idéal pour les appels et lives internationaux."
      features={[
        'Traduction vocale en direct (FR, EN, ES, et plus)',
        'Restitution avec une voix humaine naturelle',
        'Conversation fluide en temps réel',
        'Conserve le ton et le rythme de votre voix',
      ]}
      accent="#2563eb"
      glow="rgba(37,99,235,0.18)"
    />
  )
}
