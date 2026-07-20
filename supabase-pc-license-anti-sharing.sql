-- Anti-partage des licences ChapCam PC.
-- Politique retenue : 2 machines distinctes maximum par fenetre glissante de
-- 90 jours. Au-dela (3e machine differente), la licence est automatiquement
-- suspendue (status = 'suspected_sharing') et l'admin est notifie par email.
--
-- Script IDEMPOTENT : peut etre rejoue sans erreur.

-- 1) Journal des machines vues pour chaque licence.
--    On garde une ligne par (licence, empreinte machine) avec la date de
--    derniere utilisation, ce qui permet de compter les machines distinctes
--    actives sur les 90 derniers jours.
CREATE TABLE IF NOT EXISTS pc_license_machines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key  TEXT NOT NULL,
  hardware_id  TEXT NOT NULL,
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_key, hardware_id)
);

CREATE INDEX IF NOT EXISTS idx_pc_license_machines_key
  ON pc_license_machines(license_key);
CREATE INDEX IF NOT EXISTS idx_pc_license_machines_last_seen
  ON pc_license_machines(license_key, last_seen);

-- 2) Journal des transferts de machine (deja utilise en best-effort par /verify).
--    On garantit sa presence pour conserver l'historique des re-liaisons.
CREATE TABLE IF NOT EXISTS license_rebinds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key          TEXT NOT NULL,
  previous_hardware_id TEXT,
  new_hardware_id      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_license_rebinds_key ON license_rebinds(license_key);

-- 3) Colonnes de suivi du signalement sur pc_licenses.
--    status peut desormais valoir 'active' | 'revoked' | 'suspected_sharing'.
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS flagged_at   TIMESTAMPTZ;
ALTER TABLE pc_licenses ADD COLUMN IF NOT EXISTS flag_reason  TEXT;

-- 4) Securite au niveau ligne pour les nouvelles tables (gerees via service_role).
ALTER TABLE pc_license_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manages license machines" ON pc_license_machines;
CREATE POLICY "Service manages license machines"
  ON pc_license_machines FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE license_rebinds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manages license rebinds" ON license_rebinds;
CREATE POLICY "Service manages license rebinds"
  ON license_rebinds FOR ALL USING (true) WITH CHECK (true);
