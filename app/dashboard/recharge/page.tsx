import { redirect } from 'next/navigation'

// L'ancienne page de paiement PayDunya/Mobile Money est remplacee par la page
// d'abonnement avec les liens Wave et les numeros (Orange/MTN/Moov).
// On redirige donc toute visite vers /dashboard/plans pour eviter la page cassee.
export default function RechargeRedirect() {
  redirect('/dashboard/plans')
}
