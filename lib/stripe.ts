import "server-only"
import Stripe from "stripe"

function getStripeInstance() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-04-30.basil",
  })
}

export function getStripe() {
  return getStripeInstance()
}
