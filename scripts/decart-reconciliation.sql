-- =====================================================================
-- RECONCILIATION Decart : tokens emis (autorisations GPU) vs sessions
-- reellement facturees (swap_sessions).
--
-- But : detecter le gaspillage = un token emis SANS session facturee
-- derriere (GPU potentiellement consomme mais jamais debite au client).
--
-- Pre-requis : avoir execute scripts/decart-token-logs.sql (table
-- decart_token_logs alimentee par /api/decart-token).
--
-- Regle de rapprochement : un token est "utilise" s'il existe une
-- swap_session du MEME user dont started_at tombe dans la fenetre de
-- validite du token [created_at ; expires_at + 2 min de marge].
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) RESUME PAR JOUR : combien de tokens emis, combien ont donne lieu a
--    une session facturee, et le taux de gaspillage.
-- ---------------------------------------------------------------------
select
  date_trunc('day', t.created_at)::date              as jour,
  count(*)                                            as tokens_emis,
  count(s.id)                                         as tokens_avec_session,
  count(*) - count(s.id)                              as tokens_sans_session,
  round(100.0 * (count(*) - count(s.id)) / count(*), 1) as pct_gaspillage
from decart_token_logs t
left join lateral (
  select ss.id
  from swap_sessions ss
  where ss.user_id = t.user_id
    and ss.started_at >= t.created_at
    and ss.started_at <= coalesce(t.expires_at, t.created_at + interval '10 min') + interval '2 min'
  limit 1
) s on true
group by 1
order by 1 desc;


-- ---------------------------------------------------------------------
-- 2) TOKENS SANS SESSION (candidats gaspillage) sur les 7 derniers jours.
--    Chaque ligne = un token emis pour lequel AUCUNE session facturee
--    n'a ete trouvee dans sa fenetre de validite.
-- ---------------------------------------------------------------------
select
  t.created_at,
  t.email,
  t.plan,
  t.no_watermark,
  t.points_at_issue,
  t.expires_at
from decart_token_logs t
where t.created_at >= now() - interval '7 days'
  and not exists (
    select 1 from swap_sessions ss
    where ss.user_id = t.user_id
      and ss.started_at >= t.created_at
      and ss.started_at <= coalesce(t.expires_at, t.created_at + interval '10 min') + interval '2 min'
  )
order by t.created_at desc;


-- ---------------------------------------------------------------------
-- 3) RECAP PAR UTILISATEUR : qui emet beaucoup de tokens pour peu de
--    sessions facturees (detection d'abus/fuite par compte).
-- ---------------------------------------------------------------------
select
  t.email,
  t.plan,
  count(*)                                            as tokens_emis,
  count(s.id)                                         as tokens_utilises,
  count(*) - count(s.id)                              as tokens_sans_session,
  coalesce(sum(s.points_used), 0)                     as points_factures
from decart_token_logs t
left join lateral (
  select ss.id, ss.points_used
  from swap_sessions ss
  where ss.user_id = t.user_id
    and ss.started_at >= t.created_at
    and ss.started_at <= coalesce(t.expires_at, t.created_at + interval '10 min') + interval '2 min'
  limit 1
) s on true
where t.created_at >= now() - interval '30 days'
group by t.email, t.plan
having count(*) - count(s.id) > 0
order by tokens_sans_session desc;
