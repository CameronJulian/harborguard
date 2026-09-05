-- HarborGuard HSPP execution-lease renew contention hardening.
--
-- Temporary serialization contention does not prove lease loss.
-- CONTENDED grants no authority and exposes no claimed expiry.
--
-- Existing RENEWED and LOST semantics remain unchanged.

create or replace function
public.renew_hspp_assembly_assessment_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer
)
returns table (
  renew_state text,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();

  v_expires_at timestamptz;
begin
  if p_organization_id is null then
    raise exception
      'organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'assembly_id is required';
  end if;

  if p_lease_token is null then
    raise exception
      'lease_token is required';
  end if;

  if (
    p_lease_seconds is null
    or p_lease_seconds < 1
    or p_lease_seconds > 3600
  ) then
    raise exception
      'lease_seconds must be between 1 and 3600';
  end if;

  if not pg_try_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-assembly-assessment-execution-lease:' ||
      p_organization_id::text ||
      ':' ||
      p_assembly_id::text,
      0
    )
  ) then
    /*
     * Serialization contention does not prove lease loss.
     */
    return query
    select
      'CONTENDED'::text,
      null::timestamptz;

    return;
  end if;

  update public.hspp_assembly_assessment_execution_leases as lease
  set
    renewed_at = v_now,
    expires_at =
      v_now + make_interval(secs => p_lease_seconds)
  where lease.organization_id = p_organization_id
    and lease.assembly_id = p_assembly_id
    and lease.lease_token = p_lease_token
    and lease.expires_at > v_now
  returning lease.expires_at
  into v_expires_at;

  if found then
    return query
    select
      'RENEWED'::text,
      v_expires_at;

    return;
  end if;

  return query
  select
    'LOST'::text,
    null::timestamptz;
end;
$$;