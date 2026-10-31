-- ChapCam - Correctif faille "credit gratuit" sur public.profiles
-- A executer dans Supabase > SQL Editor (projet ojmzqokffbptmcktnwdy).
-- Idempotent : peut etre relance sans risque. Ne modifie aucun solde existant.
--
-- Cause : la politique RLS UPDATE de profiles autorise un utilisateur sur SA ligne,
-- et le role "authenticated" possede le privilege UPDATE sur toutes les colonnes,
-- y compris points / plan / plan_expires_at. RLS filtre les LIGNES, pas les COLONNES.
--
-- Correctif :
--  1. Privileges par colonne : les clients ne peuvent ecrire que les champs de profil ordinaires.
--  2. Trigger de garde : meme si un GRANT large est reapplique plus tard, un client
--     (anon/authenticated) ne peut jamais changer points / plan / plan_expires_at.
--  3. Fonction de debit/remboursement atomique, executable uniquement par service_role.
-- Les politiques RLS existantes ne sont PAS modifiees. service_role (webhooks, routes serveur)
-- garde tous ses droits.

begin;

-- 1. Privileges par colonne -------------------------------------------------
revoke insert, update on table public.profiles from anon, authenticated;

grant update (full_name, avatar_url, updated_at) on table public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on table public.profiles to authenticated;

-- 2. Trigger de garde --------------------------------------------------------
create or replace function public.guard_profile_financial_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- SECURITY INVOKER : current_user est le role PostgREST de l'appelant.
  -- service_role, postgres et les fonctions SECURITY DEFINER ne sont pas concernes.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.points := 0;
    new.plan := 'free';
    new.plan_expires_at := null;
    return new;
  end if;

  if new.points is distinct from old.points
     or new.plan is distinct from old.plan
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.id is distinct from old.id then
    raise exception 'Modification des champs financiers du profil interdite'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_financial_columns on public.profiles;
create trigger guard_profile_financial_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_financial_columns();

-- 3. Debit / remboursement atomique (serveur uniquement) ---------------------
-- p_delta < 0 : debit. Refuse (retourne NULL) si le solde serait negatif.
-- p_delta > 0 : remboursement / credit.
-- Le UPDATE ... WHERE points + delta >= 0 est atomique : des requetes simultanees
-- ne peuvent pas depenser deux fois les memes points.
create or replace function public.adjust_profile_points(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_delta is null or p_delta = 0 then
    raise exception 'Parametres invalides' using errcode = '22023';
  end if;

  update public.profiles
     set points = points + p_delta,
         updated_at = now()
   where id = p_user_id
     and points + p_delta >= 0
  returning points into v_balance;

  return v_balance;
end;
$$;

revoke all on function public.adjust_profile_points(uuid, integer) from public, anon, authenticated;
grant execute on function public.adjust_profile_points(uuid, integer) to service_role;

commit;

-- Verification (lecture seule) : doit lister uniquement full_name, avatar_url, updated_at.
-- select column_name from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'profiles'
--    and grantee = 'authenticated' and privilege_type = 'UPDATE';
