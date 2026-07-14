alter table public.vision_events
  add column if not exists incident_id uuid
    references public.incidents(id)
    on delete set null,

  add column if not exists reviewed_at timestamptz null,

  add column if not exists reviewed_by uuid
    references auth.users(id)
    on delete set null,

  add column if not exists review_note text null;

create index if not exists vision_events_incident_idx
on public.vision_events (
  organization_id,
  incident_id
)
where incident_id is not null;

create index if not exists vision_events_review_status_idx
on public.vision_events (
  organization_id,
  status,
  reviewed_at desc
);

drop policy if exists
  "Users can update organization vision events"
on public.vision_events;

create policy
  "Users can update organization vision events"
on public.vision_events
for update
to authenticated
using (
  organization_id = public.current_user_org_id()
)
with check (
  organization_id = public.current_user_org_id()
);
