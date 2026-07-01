create table if not exists public.mission_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.dispatch_missions(id) on delete cascade,
  uploaded_by uuid null references public.profiles(id) on delete set null,

  evidence_type text not null default 'photo',
  file_url text null,
  file_path text null,
  signature_data text null,
  notes text null,

  latitude numeric null,
  longitude numeric null,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mission_evidence enable row level security;

create policy "Users can read organization mission evidence"
on public.mission_evidence
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization mission evidence"
on public.mission_evidence
for insert
with check (organization_id = public.current_user_org_id());

create policy "Users can update organization mission evidence"
on public.mission_evidence
for update
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

create index if not exists mission_evidence_org_mission_idx
on public.mission_evidence (organization_id, mission_id, created_at desc);

create index if not exists mission_evidence_type_idx
on public.mission_evidence (evidence_type);
