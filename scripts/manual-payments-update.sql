-- =====================================================================
-- ChapCam — Ajout des paiements manuels (Orange Money / MTN / Moov)
-- A EXECUTER dans le SQL Editor du projet Supabase REEL : ojmzqokffbptmcktnwdy
-- Ce script est ADDITIF : il ne casse rien et peut etre rejoue sans risque.
-- (Necessite que scripts/subscription-system.sql ait deja ete execute.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Etendre payment_requests pour les paiements par numero
-- ---------------------------------------------------------------------
ALTER TABLE payment_requests
  -- mode de paiement utilise : wave / orange / mtn / moov
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'wave',
  -- montant reellement declare par l'utilisateur (peut differer du prix du plan)
  ADD COLUMN IF NOT EXISTS paid_amount    INTEGER,
  -- date et heure du paiement declarees par l'utilisateur
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ,
  -- commentaire facultatif
  ADD COLUMN IF NOT EXISTS comment        TEXT;

-- Contrainte de valeurs autorisees pour payment_method (ajoutee si absente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_requests_method_check'
  ) THEN
    ALTER TABLE payment_requests
      ADD CONSTRAINT payment_requests_method_check
      CHECK (payment_method IN ('wave', 'orange', 'mtn', 'moov'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_payment_requests_method ON payment_requests(payment_method);

-- ---------------------------------------------------------------------
-- 2. Verification
-- ---------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payment_requests'
ORDER BY ordinal_position;
