-- B7490-07Q13e3
--
-- Durable infrastructure-only execution lease for one HSPP SEALED assembly.
--
-- This lease serializes the application-side whole-Q12 critical section
-- across independent Vercel/server processes.
--
-- It is NOT:
--   * an HSPP trust state;
--   * an assessment result;
--   * operational authority;
--   * a completion fact;
--   * retry identity;
--   * evidence validity;
--   * membership validity;
--   * composite validity.
--
-- Q13d4 completion remains the sole immutable whole-Q12 completion fact.
--
-- A caller-owned UUID lease token identifies the current execution owner.
-- The same token may safely recover/renew its own lease.
-- A different token may acquire only after the previous lease expires.
-- Release is permitted only to the exact current token.
--
-- PostgreSQL transaction locks serialize lease-table decisions only.
-- The persisted lease row, not the transaction lock, spans TypeScript Q12.

create table if not exists public.hspp_assembly_assessment_execution_leases (
  organization_id uuid not null,

  assembly_id uuid not null,

  lease_token uuid not null,

  acquired_at timestamptz not null,

  renewed_at timestamptz not null,

  expires_at timestamptz not null,

  lease_version text not null
    default 'hspp-assembly-assessment-execution-lease-v1',

  primary key (
    organization_id,
    assembly_id
  ),

  constraint hspp_assembly_assessment_execution_leases_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete cascade,

  constraint hspp_assembly_assessment_execution_lease_expiry_valid
    check (expires_at > renewed_at),

  constraint hspp_assembly_assessment_execution_lease_renewal_valid
    check (renewed_at >= acquired_at),

  constraint hspp_assembly_assessment_execution_lease_version_not_blank
    check (length(trim(lease_version)) > 0)
);

create index if not exists
hspp_assembly_assessment_execution_leases_expiry_idx
on public.hspp_assembly_assessment_execution_leases (
  expires_at
);

alter table public.hspp_assembly_assessment_execution_leases
  enable row level security;

revoke all
on table public.hspp_assembly_assessment_execution_leases
from public, anon, authenticated, service_role;

grant select
on table public.hspp_assembly_assessment_execution_leases
to service_role;


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
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-assembly-assessment-execution-lease:' ||
      p_organization_id::text ||
      ':' ||
      p_assembly_id::text,
      0
    )
  );

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

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-assembly-assessment-execution-lease:' ||
      p_organization_id::text ||
      ':' ||
      p_assembly_id::text,
      0
    )
  );

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

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-assembly-assessment-execution-lease:' ||
      p_organization_id::text ||
      ':' ||
      p_assembly_id::text,
      0
    )
  );

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


revoke all
on function
public.acquire_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
from public, anon, authenticated, service_role;

revoke all
on function
public.renew_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
from public, anon, authenticated, service_role;

revoke all
on function
public.release_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated, service_role;


grant execute
on function
public.acquire_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
to service_role;

grant execute
on function
public.renew_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
to service_role;

grant execute
on function
public.release_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid
)
to service_role;


comment on table
public.hspp_assembly_assessment_execution_leases
is
  'B7490-07Q13e3 infrastructure-only bounded execution ownership for one organization-scoped HSPP assembly. It serializes whole-Q12 application execution across server instances. Lease existence is not trust, eligibility, retry identity or completion.';

comment on function
public.acquire_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
is
  'B7490-07Q13e3 atomic execution-lease acquire/recover boundary. Requires an exact SEALED assembly, permits one active token for organization plus assembly, safely replaces an expired owner, and does not execute Q12 or create completion.';

comment on function
public.renew_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid,
  integer
)
is
  'B7490-07Q13e3 exact-token bounded lease renewal. An expired, replaced or incorrect owner cannot renew.';

comment on function
public.release_hspp_assembly_assessment_execution_lease(
  uuid,
  uuid,
  uuid
)
is
  'B7490-07Q13e3 exact-token lease release. An old or incorrect owner cannot release another execution owner.';
