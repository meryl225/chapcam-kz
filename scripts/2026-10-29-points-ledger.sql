-- ============================================================
-- Incident du 29/10/2026 : credit de masse hors paiement.
--
-- Cette migration :
--   1) cree un journal durable et en ajout seul des mouvements de points
--      (points_ledger) et une table d'alertes (credit_alerts) ;
--   2) cree credit_points() : le credit ET son enregistrement sont faits dans
--      la MEME transaction, avec verrou de ligne et cle d'idempotence unique
--      (une reference = un seul credit, quel que soit le compte ou la source) ;
--   3) journalise toute modification de solde faite en dehors de credit_points()
--      (editeur SQL, script, ancien code) et leve une alerte sur les credits
--      anormaux ou de masse ;
--   4) retire aux roles clients (anon, authenticated) tout droit d'ecriture sur
--      les tables de soldes et de paiements, et l'execution de credit_points().
--
-- A executer UNE fois dans Supabase > SQL Editor. Idempotente.
-- ============================================================

BEGIN;

-- 1) Journal des mouvements ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id              bigserial PRIMARY KEY,
  subscription_id uuid,
  user_id         uuid        NOT NULL,
  delta           integer     NOT NULL,
  balance_before  integer     NOT NULL,
  balance_after   integer     NOT NULL,
  kind            text        NOT NULL,
  source          text        NOT NULL,
  reference       text,
  actor           text        NOT NULL,
  txid            bigint      NOT NULL DEFAULT txid_current(),
  meta            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_reference_key
  ON public.points_ledger (reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS points_ledger_user_created_idx
  ON public.points_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_ledger_txid_idx
  ON public.points_ledger (txid);

CREATE TABLE IF NOT EXISTS public.credit_alerts (
  id              bigserial PRIMARY KEY,
  ledger_id       bigint,
  user_id         uuid,
  subscription_id uuid,
  delta           integer,
  balance_after   integer,
  reason          text        NOT NULL,
  actor           text,
  txid            bigint      NOT NULL DEFAULT txid_current(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);
CREATE INDEX IF NOT EXISTS credit_alerts_open_idx
  ON public.credit_alerts (created_at DESC) WHERE acknowledged_at IS NULL;

-- Le journal est en ajout seul : aucune modification ni suppression.
CREATE OR REPLACE FUNCTION public.points_ledger_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger est en ajout seul (% interdit)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS points_ledger_append_only ON public.points_ledger;
CREATE TRIGGER points_ledger_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.points_ledger
  FOR EACH STATEMENT EXECUTE FUNCTION public.points_ledger_append_only();

-- Seuils d'alerte (en points ; 120 points = 1 min de Live Swap).
CREATE OR REPLACE FUNCTION public.credit_alert_threshold()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 21600 $$; -- 3 h en un seul credit

CREATE OR REPLACE FUNCTION public.raise_credit_alerts(
  p_ledger_id bigint, p_user_id uuid, p_sub_id uuid, p_delta integer,
  p_balance integer, p_actor text, p_unlogged boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_batch integer;
BEGIN
  IF p_delta <= 0 THEN RETURN; END IF;

  IF p_unlogged THEN
    INSERT INTO credit_alerts (ledger_id, user_id, subscription_id, delta, balance_after, reason, actor)
    VALUES (p_ledger_id, p_user_id, p_sub_id, p_delta, p_balance,
            'Credit de points hors credit_points() (ecriture directe)', p_actor);
  END IF;

  IF p_delta > credit_alert_threshold() THEN
    INSERT INTO credit_alerts (ledger_id, user_id, subscription_id, delta, balance_after, reason, actor)
    VALUES (p_ledger_id, p_user_id, p_sub_id, p_delta, p_balance,
            format('Credit superieur a %s points en une operation', credit_alert_threshold()), p_actor);
  END IF;

  -- Credit de masse : plus de 10 comptes credites dans la meme transaction
  -- (signature exacte de l'incident du 29/10 a 01:35). Une seule alerte par transaction.
  SELECT count(DISTINCT user_id) INTO v_batch
  FROM points_ledger WHERE txid = txid_current() AND delta > 0;
  IF v_batch = 11 THEN
    INSERT INTO credit_alerts (ledger_id, user_id, subscription_id, delta, balance_after, reason, actor)
    VALUES (p_ledger_id, NULL, NULL, NULL, NULL,
            'Credit de masse : plus de 10 comptes credites dans une seule transaction', p_actor);
  END IF;
END $$;

-- 2) Credit atomique ----------------------------------------------------------
-- p_mode = 'add' : ajoute p_delta au solde (negatif = debit, plancher 0).
-- p_mode = 'set' : remplace le solde par p_delta (forfait expire puis renouvele).
-- Retourne applied=false si la reference a deja ete creditee (idempotence).
CREATE OR REPLACE FUNCTION public.credit_points(
  p_user_id   uuid,
  p_delta     integer,
  p_kind      text,
  p_source    text,
  p_reference text  DEFAULT NULL,
  p_actor     text  DEFAULT NULL,
  p_meta      jsonb DEFAULT '{}'::jsonb,
  p_mode      text  DEFAULT 'add'
) RETURNS TABLE (applied boolean, balance integer, ledger_id bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub_id  uuid;
  v_before  integer;
  v_max     integer;
  v_after   integer;
  v_id      bigint;
  v_actor   text := COALESCE(NULLIF(p_actor, ''), current_user);
BEGIN
  IF p_user_id IS NULL OR p_delta IS NULL OR p_kind IS NULL OR p_source IS NULL THEN
    RAISE EXCEPTION 'credit_points : user_id, delta, kind et source sont requis';
  END IF;
  IF p_mode NOT IN ('add', 'set') THEN
    RAISE EXCEPTION 'credit_points : mode invalide %', p_mode;
  END IF;
  IF p_mode = 'set' AND p_delta < 0 THEN
    RAISE EXCEPTION 'credit_points : un solde ne peut pas etre negatif';
  END IF;

  -- Verrou de la ligne : les credits/debits concurrents sont serialises.
  SELECT s.id, COALESCE(s.points, 0), COALESCE(s.max_points, 0)
    INTO v_sub_id, v_before, v_max
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit_points : aucun abonnement pour %', p_user_id USING ERRCODE = 'P0002';
  END IF;

  v_after := CASE WHEN p_mode = 'set' THEN p_delta ELSE GREATEST(v_before + p_delta, 0) END;

  INSERT INTO points_ledger (subscription_id, user_id, delta, balance_before, balance_after,
                             kind, source, reference, actor, meta)
  VALUES (v_sub_id, p_user_id, v_after - v_before, v_before, v_after,
          p_kind, p_source, p_reference, v_actor, COALESCE(p_meta, '{}'::jsonb))
  ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, v_before, NULL::bigint;
    RETURN;
  END IF;

  PERFORM set_config('chapcam.ledger_write', '1', true);
  UPDATE subscriptions
     SET points           = v_after,
         points_remaining = v_after,
         max_points       = CASE WHEN p_mode = 'set' THEN v_after
                                 ELSE GREATEST(v_max + GREATEST(v_after - v_before, 0), v_after) END,
         updated_at       = now()
   WHERE id = v_sub_id;
  PERFORM set_config('chapcam.ledger_write', '0', true);

  PERFORM raise_credit_alerts(v_id, p_user_id, v_sub_id, v_after - v_before, v_after, v_actor, false);

  RETURN QUERY SELECT true, v_after, v_id;
END $$;

-- 3) Toute autre ecriture de solde est journalisee et alertee -----------------
CREATE OR REPLACE FUNCTION public.subscriptions_points_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old   integer := CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE COALESCE(OLD.points, 0) END;
  v_new   integer := COALESCE(NEW.points, 0);
  v_delta integer := v_new - v_old;
  v_actor text    := current_user || '/' || COALESCE(current_setting('request.jwt.claim.role', true), 'sql');
  v_id    bigint;
BEGIN
  IF v_delta = 0 OR current_setting('chapcam.ledger_write', true) = '1' THEN
    RETURN NEW;
  END IF;

  INSERT INTO points_ledger (subscription_id, user_id, delta, balance_before, balance_after,
                             kind, source, actor, meta)
  VALUES (NEW.id, NEW.user_id, v_delta, v_old, v_new,
          CASE WHEN v_delta < 0 THEN 'debit' ELSE 'unlogged_credit' END,
          'direct_write', v_actor, jsonb_build_object('op', TG_OP, 'plan', NEW.plan))
  RETURNING id INTO v_id;

  -- Les petits remboursements de session (< 5 min) ne sont pas alertes.
  IF v_delta > 600 THEN
    PERFORM raise_credit_alerts(v_id, NEW.user_id, NEW.id, v_delta, v_new, v_actor, true);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS subscriptions_points_audit ON public.subscriptions;
CREATE TRIGGER subscriptions_points_audit
  AFTER INSERT OR UPDATE OF points ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_points_audit();

-- 4) Permissions --------------------------------------------------------------
ALTER TABLE public.points_ledger              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger              FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.credit_alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_alerts              FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.live_allocation_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_bonus_grants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs                 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.points_ledger, public.credit_alerts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.points_ledger_id_seq, public.credit_alerts_id_seq FROM PUBLIC, anon, authenticated;

-- Les clients peuvent lire leur propre abonnement (politique RLS existante)
-- mais ne peuvent plus jamais l'ecrire, meme si une politique trop large existait.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions              FROM anon, authenticated;
REVOKE ALL                              ON public.processed_payments         FROM anon, authenticated;
REVOKE ALL                              ON public.payment_logs               FROM anon, authenticated;
REVOKE ALL                              ON public.live_allocation_migrations FROM anon, authenticated;
REVOKE ALL                              ON public.live_bonus_grants          FROM anon, authenticated;
REVOKE ALL                              ON public.admin_logs                 FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.credit_points(uuid, integer, text, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.raise_credit_alerts(bigint, uuid, uuid, integer, integer, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscriptions_points_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.points_ledger_append_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_points(uuid, integer, text, text, text, text, jsonb, text) TO service_role;
GRANT SELECT, INSERT ON public.points_ledger, public.credit_alerts TO service_role;
GRANT UPDATE (acknowledged_at) ON public.credit_alerts TO service_role;
GRANT USAGE ON SEQUENCE public.points_ledger_id_seq, public.credit_alerts_id_seq TO service_role;

-- Trace de l'incident dans le journal durable (sans toucher aux soldes).
INSERT INTO public.credit_alerts (reason, actor, delta)
SELECT 'Incident 29/10 01:35 : live_allocations_v2 a credite ' || count(*) || ' abonnements hors paiement (annule le 29/10)',
       'migration 2026-10-29-points-ledger', sum(added_points)
FROM public.live_allocation_migrations
WHERE migration_key = 'live_allocations_v2'
  AND NOT EXISTS (SELECT 1 FROM public.credit_alerts WHERE reason LIKE 'Incident 29/10 01:35%');

COMMIT;

-- ------------------------------------------------------------------
-- Controle (lecture seule) : fonctions SECURITY DEFINER executables par
-- les roles clients. Le resultat doit etre vide pour les fonctions qui
-- touchent aux soldes.
-- ------------------------------------------------------------------
-- SELECT p.proname, r.rolname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
-- CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
-- WHERE p.prosecdef AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');
