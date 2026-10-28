-- Fix RLS user_activity : l'upsert (INSERT ... ON CONFLICT (user_id) DO UPDATE)
-- echouait en 403 "USING expression" car la policy UPDATE ne laissait pas
-- l'utilisateur modifier sa propre ligne. INSERT et SELECT fonctionnent deja.
-- A executer dans Supabase > SQL Editor. RLS reste active.

alter table public.user_activity enable row level security;

-- Supprime toutes les policies UPDATE / ALL existantes (noms inconnus) pour repartir propre.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_activity' and cmd in ('UPDATE', 'ALL')
  loop
    execute format('drop policy %I on public.user_activity', p.policyname);
  end loop;
end $$;

-- Recree INSERT / SELECT si une policy ALL les couvrait.
drop policy if exists "user_activity_insert_own" on public.user_activity;
create policy "user_activity_insert_own" on public.user_activity
  for insert to authenticated
  with check (user_id::text = (select auth.uid())::text);

drop policy if exists "user_activity_select_own" on public.user_activity;
create policy "user_activity_select_own" on public.user_activity
  for select to authenticated
  using (user_id::text = (select auth.uid())::text);

create policy "user_activity_update_own" on public.user_activity
  for update to authenticated
  using (user_id::text = (select auth.uid())::text)
  with check (user_id::text = (select auth.uid())::text);

grant select, insert, update on public.user_activity to authenticated;

-- La contrainte UNIQUE requise par onConflict: 'user_id' existe deja
-- (user_activity_user_id_key) ; ceci ne fait rien si elle est presente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_activity'::regclass and contype in ('u', 'p')
      and conkey = array[(select attnum from pg_attribute
                          where attrelid = 'public.user_activity'::regclass and attname = 'user_id')]
  ) then
    alter table public.user_activity add constraint user_activity_user_id_key unique (user_id);
  end if;
end $$;

-- Verification : doit lister INSERT (with_check), SELECT (qual), UPDATE (qual + with_check).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'user_activity'
order by cmd;
