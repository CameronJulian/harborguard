create table if not exists public.mission_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.dispatch_missions(id) on delete cascade,
  author_id uuid null references public.profiles(id) on delete set null,

  notes text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mission_notes enable row level security;

create policy "Users can read organization mission notes"
on public.mission_notes
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization mission notes"
on public.mission_notes
for insert
with check (organization_id = public.current_user_org_id());

create policy "Users can update organization mission notes"
on public.mission_notes
for update
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

create index if not exists mission_notes_org_mission_idx
on public.mission_notes (organization_id, mission_id, created_at desc);
