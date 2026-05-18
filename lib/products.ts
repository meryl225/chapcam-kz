export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  duration: string
  planType: "1_day" | "30_days" | "90_days" | "365_days"
  daysValid: number
  color: string
  popular?: boolean
}

export const PRODUCTS: Product[] = [
  {
    id: "chapcam-1-day",
    name: "Forfait 1 Jour",
    description: "Acces complet pendant 24 heures",
    priceInCents: 1000000, // 10,000 FCFA
    duration: "1 JOUR",
    planType: "1_day",
    daysValid: 1,
    color: "#00d4ff",
  },
  {
    id: "chapcam-30-days",
    name: "Forfait 30 Jours",
    description: "Acces complet pendant 30 jours",
    priceInCents: 5000000, // 50,000 FCFA
    duration: "30 JOURS",
    planType: "30_days",
    daysValid: 30,
    color: "#8b5cf6",
  },
  {
    id: "chapcam-90-days",
    name: "Forfait 90 Jours",
    description: "Acces complet pendant 90 jours",
    priceInCents: 10000000, // 100,000 FCFA
    duration: "90 JOURS",
    planType: "90_days",
    daysValid: 90,
    color: "#22c55e",
  },
  {
    id: "chapcam-365-days",
    name: "Forfait 365 Jours",
    description: "Acces complet pendant 1 an - Meilleur choix",
    priceInCents: 15000000, // 150,000 FCFA
    duration: "365 JOURS",
    planType: "365_days",
    daysValid: 365,
    color: "#f97316",
    popular: true,
  },
]
