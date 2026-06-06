import type { Metadata } from "next"
import { ChapCamPcLanding } from "@/components/chapcam-pc/chapcam-pc-landing"

export const metadata: Metadata = {
  title: "ChapCam PC - Logiciel a vie | Change d'apparence sans credits",
  description:
    "Telecharge ChapCam PC, le logiciel a vie. Paiement unique, aucun credit. Prix de lancement 50.000F pendant 7 jours, puis 100.000F.",
}

export default function ChapCamPcPage() {
  return <ChapCamPcLanding />
}
