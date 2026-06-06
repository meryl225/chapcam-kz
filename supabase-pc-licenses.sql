-- Table des licences ChapCam PC (logiciel Windows standalone, achat unique a vie).
-- Script IDEMPOTENT : peut etre rejoue sans erreur, meme si une ancienne
-- version de la table `pc_licenses` existe deja avec moins de colonnes.

-- 1) Cree la table si elle n'existe pas encore (schema complet).
CREATE TABLE IF NOT EXISTS pc_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT,
  license_key  TEXT NOT NULL UNIQUE,
  hardware_id  TEXT,                            -- null jusqu'a la premiere activation
  status       TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'revoked'
  activated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Complete une table deja existante : ajoute les colonnes manquantes.
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS user_id      UUID;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS email        TEXT;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS license_key  TEXT;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS hardware_id  TEXT;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active';
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3) Index pour les recherches frequentes (apres garantie que les colonnes existent).
CREATE INDEX IF NOT EXISTS idx_pc_licenses_user_id ON pc_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pc_licenses_email   ON pc_licenses(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pc_licenses_key ON pc_licenses(license_key);

-- 4) Securite au niveau ligne.
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
