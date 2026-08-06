-- =====================================================================
-- Table decart_token_logs : journal des tokens ephemeres Decart emis.
-- Sert a RECONCILIER les tokens emis (= autorisations GPU) avec les
-- sessions reellement facturees (swap_sessions), et a detecter tout
-- gaspillage (token emis sans session facturee derriere).
--
-- Ecrite en best-effort par /api/decart-token via le service role
-- (qui bypass RLS). Lue uniquement cote admin.
-- A executer dans le SQL Editor de Supabase (projet ojmzqokffbptmcktnwdy).
-- =====================================================================

create table if not exists public.decart_token_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  plan text,
  no_watermark boolean not null default false,
  points_at_issue integer,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index pour les requetes de reconciliation (par jour, par utilisateur).
create index if not exists decart_token_logs_created_at_idx
  on public.decart_token_logs (created_at desc);
create index if not exists decart_token_logs_user_id_idx
  on public.decart_token_logs (user_id);

-- RLS activee : aucune policy publique -> seul le service role (admin) y accede.
alter table public.decart_token_logs enable row level security;
