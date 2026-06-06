-- =====================================================================
-- ChapCam — Systeme d'abonnement avec paiement Wave
-- A EXECUTER dans le SQL Editor du projet Supabase REEL : ojmzqokffbptmcktnwdy
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table wave_links : les 4 liens Wave, editables depuis /admin/settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wave_links (
  plan        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  wave_url    TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed des 4 formules (les URLs seront renseignees via l'admin)
INSERT INTO wave_links (plan, label, amount, wave_url) VALUES
  ('starter',  'Starter',  10000, ''),
  ('standard', 'Standard', 25000, ''),
  ('premium',  'Premium',  50000, ''),
  ('ultimate', 'Ultimate', 85000, '')
ON CONFLICT (plan) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Table payment_requests : demandes de confirmation de paiement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                   TEXT NOT NULL,
  email                       TEXT NOT NULL,
  phone_number                TEXT NOT NULL,
  plan                        TEXT NOT NULL,
  amount                      INTEGER NOT NULL,
  wave_transaction_reference  TEXT NOT NULL UNIQUE,   -- empeche la reutilisation d'une reference
  screenshot_url              TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id                     UUID,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  validated_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_email   ON payment_requests(email);
CREATE INDEX IF NOT EXISTS idx_payment_requests_phone   ON payment_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status  ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created ON payment_requests(created_at DESC);

-- ---------------------------------------------------------------------
-- 3. Etendre la table subscriptions (sans casser l'existant points/expires_at)
-- ---------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan       TEXT,
  ADD COLUMN IF NOT EXISTS amount     INTEGER,
  ADD COLUMN IF NOT EXISTS status     TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email      TEXT;

-- ---------------------------------------------------------------------
-- 4. Table admin_logs : journalisation des validations / refus
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action              TEXT NOT NULL,
  payment_request_id  UUID,
  admin_email         TEXT,
  details             JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- 5. Storage : bucket public pour les captures de paiement
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Autoriser l'upload (le service role bypass de toute facon les RLS,
-- mais on garde des policies coherentes pour le bucket public).
DROP POLICY IF EXISTS "payment_receipts_public_read" ON storage.objects;
CREATE POLICY "payment_receipts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "payment_receipts_service_write" ON storage.objects;
CREATE POLICY "payment_receipts_service_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-receipts');

-- ---------------------------------------------------------------------
-- 6. RLS : ces tables sont gerees UNIQUEMENT par le service role (API).
--    On active RLS sans policy publique -> aucun acces direct cote client.
-- ---------------------------------------------------------------------
ALTER TABLE wave_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs       ENABLE ROW LEVEL SECURITY;

-- Lecture publique des liens Wave (montants/labels) : on passe par l'API,
-- mais on autorise quand meme la lecture seule au cas ou.
DROP POLICY IF EXISTS "wave_links_public_read" ON wave_links;
CREATE POLICY "wave_links_public_read"
  ON wave_links FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
SELECT 'wave_links' AS table, count(*) FROM wave_links
UNION ALL SELECT 'payment_requests', count(*) FROM payment_requests
UNION ALL SELECT 'admin_logs', count(*) FROM admin_logs;
