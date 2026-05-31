-- ============================================================
-- ChapCam Live Pro - acces au face swap temps reel (2e outil)
-- ============================================================
-- Ce systeme est SEPARE des points Decart / abonnements classiques.
--   * trial_seconds_remaining : essai gratuit (2 min) offert UNE FOIS a tous les comptes
--   * pending_windows         : nombre de fenetres "15 min" achetees mais pas encore demarrees
--   * active_window_expires_at: fenetre de 15 min actuellement en cours (horloge)
--
-- Les ecritures se font cote serveur via la cle service_role (bypass RLS).
-- RLS est activee sans policy d'ecriture : les clients ne peuvent rien modifier.
-- ============================================================

create table if not exists public.live_access (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  trial_seconds_remaining   integer not null default 120,
  pending_windows           integer not null default 0,
  active_window_expires_at  timestamptz,
  trial_last_beat_at        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.live_access enable row level security;

-- L'utilisateur peut lire sa propre ligne (lecture seule).
drop policy if exists "live_access_select_own" on public.live_access;
create policy "live_access_select_own"
  on public.live_access
  for select
  using (auth.uid() = user_id);

-- Aucune policy d'insertion/update/delete cote client :
-- seules les routes serveur (service_role) ecrivent dans cette table.

create index if not exists live_access_window_idx
  on public.live_access (active_window_expires_at);
