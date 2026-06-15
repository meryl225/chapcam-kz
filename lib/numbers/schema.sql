-- ChapCam Numbers — reference PostgreSQL schema (Supabase-ready).
-- This is a documentation/reference deliverable for the UI scaffold.
-- Apply via the Supabase SQL editor or a migration tool when wiring a real backend.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users (mirrors auth.users in Supabase; profile data lives here)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,                       -- references auth.users(id)
  email text not null unique,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  accepted_aup_at timestamptz,
  two_factor_enabled boolean not null default false,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Wallets & transactions
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  balance_cents bigint not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  kind text not null check (kind in ('deposit', 'purchase', 'refund', 'payout')),
  method text not null,                      -- 'Orange Money','MTN','Wave','Visa','USDT',...
  amount_cents bigint not null,              -- positive = credit, negative = debit
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  reference text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Providers & countries (aggregation engine inputs)
-- ---------------------------------------------------------------------------
create table if not exists public.providers (
  id text primary key,
  name text not null,
  reliability numeric(5,2) not null default 0,
  avg_delivery_sec int not null default 0,
  status text not null default 'healthy' check (status in ('healthy', 'degraded', 'down')),
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  code text primary key,                     -- ISO-2
  name text not null,
  dial_code text not null,
  flag text
);

-- ---------------------------------------------------------------------------
-- Numbers inventory & ownership
-- ---------------------------------------------------------------------------
create table if not exists public.numbers (
  id uuid primary key default gen_random_uuid(),
  e164 text not null,
  country_code text not null references public.countries(code),
  provider_id text not null references public.providers(id),
  type text not null check (type in ('temporary', 'long-term')),
  capabilities text[] not null default '{sms}',
  price_cents bigint not null,
  state text not null default 'available' check (state in ('available', 'reserved', 'assigned', 'retired')),
  owner_id uuid references public.users(id) on delete set null,
  label text,
  auto_renew boolean not null default false,
  purchased_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists numbers_owner_idx on public.numbers(owner_id);
create index if not exists numbers_country_idx on public.numbers(country_code);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  number_id uuid references public.numbers(id) on delete set null,
  provider_id text references public.providers(id),
  amount_cents bigint not null,
  status text not null default 'active' check (status in ('active', 'completed', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);

-- ---------------------------------------------------------------------------
-- Inbound messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete cascade,
  sender text not null,
  body text not null,
  received_at timestamptz not null default now(),
  read boolean not null default false,
  archived boolean not null default false
);
create index if not exists messages_number_idx on public.messages(number_id);

-- ---------------------------------------------------------------------------
-- API keys
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  prefix text not null,
  hashed_secret text not null,               -- store only a hash of the secret
  scopes text[] not null default '{numbers:read}',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists api_keys_user_idx on public.api_keys(user_id);

-- ---------------------------------------------------------------------------
-- Support tickets
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  category text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  created_at timestamptz not null default now(),
  last_reply_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author text not null check (author in ('user', 'agent')),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin audit logs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security (enable + per-user scoping; admins via role claim)
-- ---------------------------------------------------------------------------
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.numbers enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.api_keys enable row level security;
alter table public.support_tickets enable row level security;

-- Example policy: a user can read their own numbers.
create policy "own numbers" on public.numbers
  for select using (owner_id = (select id from public.users where auth_id = auth.uid()));
