create table if not exists public.mission_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.dispatch_missions(id) on delete cascade,
  sender_id uuid null references public.profiles(id) on delete set null,

  sender_role text not null default 'dispatcher',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.mission_messages enable row level security;

create policy "Users can read organization mission messages"
on public.mission_messages
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization mission messages"
on public.mission_messages
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists mission_messages_org_mission_idx
on public.mission_messages (organization_id, mission_id, created_at asc);

create index if not exists mission_messages_sender_role_idx
on public.mission_messages (sender_role);
