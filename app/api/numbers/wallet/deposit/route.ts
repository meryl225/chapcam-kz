import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// DÉSACTIVÉ — crédit direct sans paiement.
//
// Cet endpoint créditait autrefois le portefeuille « manuellement » sans aucun
// paiement réel. C'était une faille : tout utilisateur connecté pouvait se
// créditer gratuitement en appelant directement cette route.
//
// Toutes les recharges DOIVENT désormais passer par PayDunya via
// `/api/numbers/wallet/topup` : le solde n'est crédité qu'au retour d'un
// paiement confirmé (IPN vérifié par hash + reconfirmation API), garantissant
// que le client a réellement payé avant d'être crédité.
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Les recharges directes sont désactivées. Utilisez le paiement sécurisé PayDunya pour approvisionner votre portefeuille.',
    },
    { status: 410 },
  )
}
