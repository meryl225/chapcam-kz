import { Mic } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function VoiceChangerPage() {
  return (
    <ComingSoon
      icon={Mic}
      title="Voice Changer V1"
      description="Transformez votre voix en temps réel avec de vraies voix humaines pendant vos appels et vos lives. Aucune voix robotique : uniquement des voix naturelles et réalistes."
      features={[
        'Voix humaines réelles en temps réel',
        'Faible latence pour les appels et lives',
        'Conserve votre intonation et vos émotions',
        'Bibliothèque de voix prêtes à l’emploi',
      ]}
      accent="#22d3ee"
      glow="rgba(34,211,238,0.18)"
    />
  )
}
