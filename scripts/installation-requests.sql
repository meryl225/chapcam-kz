-- Demandes d'installation ChapCam (WhatsApp, Telegram, Teams, Google Meet, etc.)
-- A executer dans le SQL editor du projet Supabase ChapCam (ojmzqokffbptmcktnwdy).

create table if not exists public.installation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  full_name text,
  phone text not null,        -- numero joignable
  location text not null,     -- lieu d'installation
  apps text[] not null default '{}', -- apps a installer avec ChapCam
  note text,
  status text not null default 'pending', -- pending | done | cancelled
  created_at timestamptz not null default now()
);

alter table public.installation_requests enable row level security;

-- L'utilisateur peut lire ses propres demandes.
drop policy if exists "installation_requests_select_own" on public.installation_requests;
create policy "installation_requests_select_own"
  on public.installation_requests for select
  using (auth.uid() = user_id);

-- L'utilisateur peut creer ses propres demandes.
-- (L'API serveur utilise la cle service_role et contourne la RLS de toute facon.)
drop policy if exists "installation_requests_insert_own" on public.installation_requests;
create policy "installation_requests_insert_own"
  on public.installation_requests for insert
  with check (auth.uid() = user_id);

create index if not exists installation_requests_user_idx
  on public.installation_requests (user_id);
create index if not exists installation_requests_status_idx
  on public.installation_requests (status, created_at desc);
