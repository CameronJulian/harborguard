-- HarborGuard HSPP execution-lease acquire contention hardening.
--
-- CONTENDED means another transaction currently owns the
-- lease-decision serialization lock.
--
-- No authority is granted and no lease metadata is claimed.
-- Existing BUSY semantics remain unchanged.

create or replace function
public.acquire_hspp_assembly_assessment_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer
)
returns table (
  acquire_state text,
  returned_lease_token uuid,
  lease_acquired_at timestamptz,
  lease_renewed_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();

  v_assembly_state text;

  v_lease
    public.hspp_assembly_assessment_execution_leases%rowtype;
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

  /*
   * Serialize only acquire/renew/release decisions for this exact
   * organization-scoped assembly.
   *
   * This transaction lock does not pretend to span application Q12.
   */
  if not pg_try_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-assembly-assessment-execution-lease:' ||
      p_organization_id::text ||
      ':' ||
      p_assembly_id::text,
      0
    )
  ) then
    return query
    select
      'CONTENDED'::text,
      null::uuid,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz;

    return;
  end if;

  /*
   * Require the exact persisted SEALED assembly.
   */
  select assembly_state
  into v_assembly_state
  from public.hspp_evidence_assemblies
  where organization_id = p_organization_id
    and id = p_assembly_id
  for update;

  if not found then
    raise exception
      'HSPP evidence assembly not found';
  end if;

  if v_assembly_state <> 'SEALED' then
    raise exception
      'HSPP assessment execution lease requires a SEALED assembly';
  end if;

  select lease.*
  into v_lease
  from public.hspp_assembly_assessment_execution_leases as lease
  where lease.organization_id = p_organization_id
    and lease.assembly_id = p_assembly_id
  for update;

  if not found then
    insert into public.hspp_assembly_assessment_execution_leases (
      organization_id,
      assembly_id,
      lease_token,
      acquired_at,
      renewed_at,
      expires_at
    )
    values (
      p_organization_id,
      p_assembly_id,
      p_lease_token,
      v_now,
      v_now,
      v_now + make_interval(secs => p_lease_seconds)
    )
    returning *
    into v_lease;

    return query
    select
      'ACQUIRED'::text,
      v_lease.lease_token,
      v_lease.acquired_at,
      v_lease.renewed_at,
      v_lease.expires_at;

    return;
  end if;

  /*
   * Exact-owner retry/recovery.
   *
   * A caller that already owns this lease may refresh it safely.
   */
  if v_lease.lease_token = p_lease_token then
    update public.hspp_assembly_assessment_execution_leases as lease
    set
      renewed_at = v_now,
      expires_at =
        v_now + make_interval(secs => p_lease_seconds)
    where lease.organization_id = p_organization_id
      and lease.assembly_id = p_assembly_id
      and lease.lease_token = p_lease_token
    returning lease.*
    into v_lease;

    return query
    select
      'ACQUIRED'::text,
      v_lease.lease_token,
      v_lease.acquired_at,
      v_lease.renewed_at,
      v_lease.expires_at;

    return;
  end if;

  /*
   * Safe stale-owner takeover.
   *
   * The previous owner's token is replaced only after its bounded lease
   * has expired.
   */
  if v_lease.expires_at <= v_now then
    update public.hspp_assembly_assessment_execution_leases as lease
    set
      lease_token = p_lease_token,
      acquired_at = v_now,
      renewed_at = v_now,
      expires_at =
        v_now + make_interval(secs => p_lease_seconds)
    where lease.organization_id = p_organization_id
      and lease.assembly_id = p_assembly_id
      and lease.lease_token = v_lease.lease_token
      and lease.expires_at <= v_now
    returning lease.*
    into v_lease;

    if not found then
      raise exception
        'HSPP assessment execution lease changed during serialized takeover';
    end if;

    return query
    select
      'ACQUIRED'::text,
      v_lease.lease_token,
      v_lease.acquired_at,
      v_lease.renewed_at,
      v_lease.expires_at;

    return;
  end if;

  /*
   * Another live token currently owns this assembly.
   *
   * Do not expose that owner's token.
   */
  return query
  select
    'BUSY'::text,
    null::uuid,
    v_lease.acquired_at,
    v_lease.renewed_at,
    v_lease.expires_at;
end;
$$;