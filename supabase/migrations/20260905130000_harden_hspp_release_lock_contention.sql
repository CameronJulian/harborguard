-- HarborGuard HSPP execution-lease release contention hardening.
--
-- Temporary serialization contention does not prove successful release,
-- loss of ownership, or lease absence.
--
-- CONTENDED therefore remains distinct from RELEASED and NOT_OWNER.

create or replace function
public.release_hspp_assembly_assessment_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid
)
returns table (
  release_state text
)
language plpgsql
security definer
set search_path = public
as $$
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
     * Temporary serialization contention does not prove successful
     * release, loss of ownership, or lease absence.
     */
    return query
    select 'CONTENDED'::text;

    return;
  end if;

  delete from public.hspp_assembly_assessment_execution_leases as lease
  where lease.organization_id = p_organization_id
    and lease.assembly_id = p_assembly_id
    and lease.lease_token = p_lease_token;

  if found then
    return query
    select 'RELEASED'::text;

    return;
  end if;

  return query
  select 'NOT_OWNER'::text;
end;
$$;