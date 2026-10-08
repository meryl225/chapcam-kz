"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Status = "idle" | "sending" | "sent" | "error"

export function SupportForm() {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    setStatus("sending")
    setErrorMessage("")
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Envoi impossible pour le moment.")
      form.reset()
      setStatus("sent")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Envoi impossible pour le moment.")
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Message envoyé</h2>
        <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
          Merci, votre demande a bien été transmise à notre équipe. Nous vous répondrons à l&apos;adresse email indiquée.
        </p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          Envoyer une autre demande
        </Button>
      </div>
    )
  }

  const sending = status === "sending"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate={false}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="support-name">Nom</Label>
          <Input id="support-name" name="name" autoComplete="name" required maxLength={100} placeholder="Votre nom" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="support-email">Email</Label>
          <Input
            id="support-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="vous@exemple.com"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-subject">Sujet</Label>
        <Input
          id="support-subject"
          name="subject"
          required
          maxLength={150}
          placeholder="Ex. : abonnement, paiement, connexion…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          name="message"
          required
          maxLength={5000}
          rows={6}
          placeholder="Décrivez votre demande avec le plus de détails possible."
          className="min-h-36 resize-y"
        />
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="support-website">Site web</label>
        <input id="support-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto sm:self-end">
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Envoyer
          </>
        )}
      </Button>
    </form>
  )
}
