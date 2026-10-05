-- Notifications push iOS (generations video terminees).
-- A executer une fois dans Supabase > SQL Editor (projet ojmzqokffbptmcktnwdy).
-- RLS active sans aucune policy : seules les routes serveur (service_role) lisent/ecrivent.

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

-- Une ligne par generation notifiee : la cle primaire garantit une seule notification.
create table if not exists public.generation_notifications (
  generation_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text,
  sent_at timestamptz not null default now()
);
create index if not exists generation_notifications_user_idx on public.generation_notifications (user_id);
alter table public.generation_notifications enable row level security;
