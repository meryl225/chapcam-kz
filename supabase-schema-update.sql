-- Mise a jour de la table subscriptions pour le systeme de points
-- Executer dans Supabase SQL Editor

-- Ajouter les colonnes points et max_points si elles n'existent pas
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Mettre a jour la colonne expires_at si elle n'existe pas
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Mettre a jour la colonne is_active si elle n'existe pas
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Creer un index pour ameliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Mettre a jour la table swap_sessions pour enregistrer l'utilisation des points
ALTER TABLE swap_sessions
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;

-- S'assurer que la table profiles a la colonne email
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Creer un index sur email pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Policy pour permettre aux utilisateurs de voir et modifier leur propre subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" 
ON subscriptions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription" 
ON subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy pour le service (utilise par l'API avec le service role)
DROP POLICY IF EXISTS "Service can manage subscriptions" ON subscriptions;
CREATE POLICY "Service can manage subscriptions" 
ON subscriptions FOR ALL 
USING (true)
WITH CHECK (true);

-- Fonction pour mettre a jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre a jour updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verifier que tout est correct
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscriptions';
