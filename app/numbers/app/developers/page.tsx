import { redirect } from 'next/navigation'

// L'accès API n'est pas proposé aux utilisateurs : toute visite directe de
// cette route est redirigée vers le tableau de bord.
export default function DevelopersPage() {
  redirect('/numbers/app')
}
