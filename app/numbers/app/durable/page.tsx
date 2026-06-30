import { DurableApp } from '@/components/numbers/durable/durable-app'

export const metadata = {
  title: 'Numéro illimité — ChapCam Numbers',
  description: 'Obtenez un vrai numéro par abonnement mensuel : SMS et appels illimités, conservé tant que vous le gardez.',
}

export default function DurablePage() {
  return <DurableApp />
}
