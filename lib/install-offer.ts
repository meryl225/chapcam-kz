// Source de verite des frais d'installation a domicile de ChapCam.
// Ces frais sont SEPARES des formules d'abonnement (lib/plans.ts) et de
// l'offre Live Pro (lib/live-offers.ts). Ils correspondent au deplacement de
// l'equipe + la configuration complete (WhatsApp, reseaux sociaux, tests).

export interface InstallOffer {
  id: string
  name: string
  price: number // FCFA
  description: string
}

export const INSTALL_FEE: InstallOffer = {
  id: 'install',
  name: "Frais d'installation a domicile",
  price: 8500,
  description:
    "Deplacement de l'equipe ChapCam, installation et configuration completes (WhatsApp, reseaux sociaux), tests en direct et assistance a la prise en main.",
}

export function getInstallOffer(id: string): InstallOffer | undefined {
  return id === INSTALL_FEE.id ? INSTALL_FEE : undefined
}

export function isInstallOffer(id: string): boolean {
  return id === INSTALL_FEE.id
}
