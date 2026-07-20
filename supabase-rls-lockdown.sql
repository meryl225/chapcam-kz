-- =============================================================================
-- CHAPCAM — VERROUILLAGE DE SECURITE (RLS) DES TABLES SENSIBLES
-- =============================================================================
-- CONTEXTE : la cle publique "anon" (presente dans le JS du site et dans le
-- code source du logiciel PC qui a fuite) pouvait ECRIRE directement dans la
-- table `subscriptions` via l'API REST de Supabase, sans passer par le serveur.
-- C'est ce qui a permis a des bots de se creer 320 faux abonnements VIP.
--
-- CE SCRIPT :
--   1. Active la Row Level Security (RLS) sur toutes les tables sensibles.
--   2. Supprime toute policy trop permissive existante.
--   3. Autorise uniquement la lecture de SON PROPRE abonnement (authenticated).
--   4. N'autorise AUCUNE ecriture via anon/authenticated.
--
-- IMPORTANT : le role `service_role` (utilise par ton serveur / API routes)
-- CONTOURNE la RLS automatiquement. Donc TOUT le fonctionnement de l'app
-- (paiements, credits, admin, licences PC) continue de marcher normalement.
-- Seuls les acces directs via la cle publique anon sont bloques.
--
-- A EXECUTER DANS : Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Ce script est idempotent : tu peux le rejouer sans risque.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) subscriptions : lecture de sa propre ligne, aucune ecriture cliente
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- Supprime les eventuelles policies existantes (permissives) sur la table.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions;', p.policyname);
  END LOOP;
END $$;

-- Un utilisateur connecte peut lire UNIQUEMENT son propre abonnement.
CREATE POLICY "read_own_subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- (Aucune policy INSERT/UPDATE/DELETE => ecriture impossible via anon/authenticated.
--  Le serveur, via service_role, contourne la RLS et continue d'ecrire.)

-- -----------------------------------------------------------------------------
-- 2) Tables 100% serveur : on verrouille tout (aucune policy = tout bloque
--    pour anon/authenticated ; service_role contourne toujours la RLS).
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_logs',
    'processed_payments',
    'payment_requests',
    'pc_licenses',
    'pc_license_machines',
    'admin_logs'
  ]
  LOOP
    -- N'agit que si la table existe reellement.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
      -- Supprime toute policy permissive existante.
      EXECUTE (
        SELECT string_agg(
          format('DROP POLICY IF EXISTS %I ON public.%I;', policyname, t),
          ' '
        )
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION (optionnel) : liste l'etat RLS des tables ciblees.
-- =============================================================================
-- SELECT relname AS table, relrowsecurity AS rls_active, relforcerowsecurity AS rls_forced
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace
--   AND relname IN ('subscriptions','payment_logs','processed_payments',
--                   'payment_requests','pc_licenses','pc_license_machines','admin_logs')
-- ORDER BY relname;
