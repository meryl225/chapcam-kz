-- Table des licences ChapCam PC (logiciel Windows standalone, achat unique a vie).
-- A executer dans Supabase SQL Editor (ou applique automatiquement par v0).

CREATE TABLE IF NOT EXISTS pc_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT,
  license_key  TEXT NOT NULL UNIQUE,
  hardware_id  TEXT,                       -- null jusqu'a la premiere activation
  status       TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  activated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches frequentes.
CREATE INDEX IF NOT EXISTS idx_pc_licenses_user_id ON pc_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pc_licenses_email ON pc_licenses(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pc_licenses_key ON pc_licenses(license_key);

-- Securite au niveau ligne.
ALTER TABLE pc_licenses ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut voir ses propres licences.
DROP POLICY IF EXISTS "Users can view own pc licenses" ON pc_licenses;
CREATE POLICY "Users can view own pc licenses"
ON pc_licenses FOR SELECT
USING (auth.uid() = user_id);

-- Le service (cle service_role utilisee par les API) gere tout.
-- Les API d'activation/verification et de fulfillment utilisent le client admin,
-- qui contourne la RLS, mais on garde une policy explicite par clarte.
DROP POLICY IF EXISTS "Service can manage pc licenses" ON pc_licenses;
CREATE POLICY "Service can manage pc licenses"
ON pc_licenses FOR ALL
USING (true)
WITH CHECK (true);
