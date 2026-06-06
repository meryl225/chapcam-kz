-- =====================================================================
-- Table user_activity : suivi "best effort" des utilisateurs actifs.
-- Le code de la page Live fait un upsert avec onConflict: 'user_id'.
-- Pour que cet upsert fonctionne (au lieu de renvoyer une erreur 400),
-- la colonne user_id DOIT avoir une contrainte UNIQUE.
-- A executer dans le SQL Editor de Supabase (projet ojmzqokffbptmcktnwdy).
-- =====================================================================

create table if not exists public.user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_active timestamptz not null default now(),
  current_page text
);

-- Si la table existait deja SANS contrainte sur user_id, on l'ajoute.
-- (Ignore l'erreur si la contrainte/PK existe deja.)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_activity'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute
         where attrelid = 'public.user_activity'::regclass and attname = 'user_id')
      ]
  ) then
    alter table public.user_activity
      add constraint user_activity_user_id_key unique (user_id);
  end if;
end $$;

-- Index pour les requetes "utilisateurs actifs recemment"
create index if not exists user_activity_last_active_idx
  on public.user_activity (last_active desc);

-- RLS : chaque utilisateur ne gere que sa propre ligne.
alter table public.user_activity enable row level security;

drop policy if exists "user_activity_self" on public.user_activity;
create policy "user_activity_self"
  on public.user_activity
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
