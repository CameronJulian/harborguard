-- HarborGuard incident-resolution lifecycle atomicity hardening.
--
-- The application previously resolved public.incidents and its linked
-- public.vehicle_alerts row using two separate PostgREST updates.
-- A failure between those writes could leave the incident Resolved while
-- the linked alert remained unresolved.
--
-- This RPC moves the complete state transition behind one PostgreSQL
-- transaction boundary. Any exception rolls back both lifecycle writes.

create or replace function public.resolve_incident_with_linked_alert(
  p_organization_id uuid,
  p_incident_id uuid,
  p_resolution_note text default null
)
returns table (
  resolved_incident_id uuid,
  incident_status text,
  linked_vehicle_alert_id uuid,
  linked_alert_resolved boolean,
  lifecycle_resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.incidents%rowtype;
  v_alert public.vehicle_alerts%rowtype;
  v_now timestamptz := now();
  v_caller_organization_id uuid;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  if p_incident_id is null then
    raise exception 'incident_id is required';
  end if;

  /*
   * SECURITY DEFINER must not itself grant cross-organization authority.
   * Preserve the route's authenticated organization boundary explicitly.
   */
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_caller_organization_id :=
    public.current_user_org_id();

  if (
    v_caller_organization_id is null
    or v_caller_organization_id <> p_organization_id
  ) then
    raise exception 'Permission denied';
  end if;

  /*
   * Serialize resolution for this exact incident.
   */
  select incident_row.*
  into v_incident
  from public.incidents as incident_row
  where incident_row.id = p_incident_id
    and incident_row.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Incident not found';
  end if;

  /*
   * If an alert relation exists, lock and validate that exact related row
   * before either lifecycle mutation is committed.
   */
  if v_incident.vehicle_alert_id is not null then
    select alert_row.*
    into v_alert
    from public.vehicle_alerts as alert_row
    where alert_row.id = v_incident.vehicle_alert_id
      and alert_row.organization_id = p_organization_id
    for update;

    if not found then
      raise exception
        'Linked vehicle alert not found in incident organization';
    end if;
  end if;

  update public.incidents as incident_row
  set
    status = 'Resolved',
    resolved_by = auth.uid(),
    resolved_at = v_now,
    resolution_note =
      nullif(trim(coalesce(p_resolution_note, '')), '')
  where incident_row.id = v_incident.id
    and incident_row.organization_id = p_organization_id;

  if v_incident.vehicle_alert_id is not null then
    update public.vehicle_alerts as alert_row
    set
      is_resolved = true,
      resolved_at = v_now,
      resolution_notes =
        coalesce(
          nullif(trim(coalesce(p_resolution_note, '')), ''),
          'Resolved via incident management.'
        )
    where alert_row.id = v_incident.vehicle_alert_id
      and alert_row.organization_id = p_organization_id
      and alert_row.is_resolved = false;

    /*
     * Re-read under the same transaction so the returned state describes
     * the authoritative row after this resolution attempt.
     */
    select alert_row.*
    into v_alert
    from public.vehicle_alerts as alert_row
    where alert_row.id = v_incident.vehicle_alert_id
      and alert_row.organization_id = p_organization_id;

    if not found then
      raise exception
        'Linked vehicle alert disappeared during incident resolution';
    end if;

    if v_alert.is_resolved is distinct from true then
      raise exception
        'Linked vehicle alert did not resolve atomically';
    end if;
  end if;

  return query
  select
    v_incident.id,
    'Resolved'::text,
    v_incident.vehicle_alert_id,
    case
      when v_incident.vehicle_alert_id is null then null::boolean
      else true
    end,
    v_now;
end;
$$;

revoke all on function public.resolve_incident_with_linked_alert(
  uuid,
  uuid,
  text
)
from public, anon;

grant execute on function public.resolve_incident_with_linked_alert(
  uuid,
  uuid,
  text
)
to authenticated;

comment on function public.resolve_incident_with_linked_alert(
  uuid,
  uuid,
  text
)
is
'Atomically resolves one organization-scoped incident and, when linked, its vehicle alert. Locks both lifecycle rows before mutation so partial incident/alert resolution cannot commit.';
