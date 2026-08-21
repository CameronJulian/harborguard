-- HSPP-009B / B11A1:
-- immutable multi-evidence assembly foundation.
--
-- Assembly lifecycle:
--
--   create OPEN assembly
--          |
--          v
--   append immutable evidence members
--          |
--          v
--   OPEN -> SEALED
--          |
--          v
--   membership permanently closed
--
-- Evidence members remain immutable from insertion.
--
-- Once SEALED:
-- - the assembly cannot be edited again;
-- - evidence members cannot be added;
-- - existing members cannot be changed or deleted.
--
-- This migration intentionally does NOT:
-- - determine whether two observations describe the same physical event;
-- - perform spatial or temporal clustering;
-- - detect corroboration or contradiction;
-- - establish physical-world truth;
-- - promote HSPP trust state;
-- - enable Crowd Intelligence;
-- - enable ML training or validation;
-- - change Route Safety scoring, alerts, rerouting or escalation;
-- - create a master HSPP decision.
--
-- Membership-selection policy and completed-assembly verification remain
-- separate protocol stages.

create table public.hspp_evidence_assemblies (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  assembly_version text not null
    default 'hspp-evidence-assembly-v1',

  membership_policy_version text not null,

  assembly_state text not null
    default 'OPEN',

  created_at timestamptz not null
    default now(),

  sealed_at timestamptz null,

  constraint hspp_evidence_assemblies_version_not_blank
    check (
      length(trim(assembly_version)) > 0
    ),

  constraint hspp_evidence_assemblies_policy_not_blank
    check (
      length(trim(membership_policy_version)) > 0
    ),

  constraint hspp_evidence_assemblies_state_v1
    check (
      assembly_state in (
        'OPEN',
        'SEALED'
      )
    ),

  constraint hspp_evidence_assemblies_seal_state_consistent
    check (
      (
        assembly_state = 'OPEN'
        and sealed_at is null
      )
      or
      (
        assembly_state = 'SEALED'
        and sealed_at is not null
      )
    ),

  constraint hspp_evidence_assemblies_org_identity_unique
    unique (
      organization_id,
      id
    )
);

create table public.hspp_evidence_assembly_members (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  assembly_id uuid not null,

  evidence_id uuid not null,

  evidence_integrity_fingerprint text not null,

  member_ordinal integer not null,

  added_at timestamptz not null
    default now(),

  constraint hspp_evidence_assembly_member_fingerprint_sha256
    check (
      evidence_integrity_fingerprint ~
        '^[0-9a-f]{64}$'
    ),

  constraint hspp_evidence_assembly_member_ordinal_positive
    check (
      member_ordinal > 0
    ),

  constraint hspp_evidence_assembly_members_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_evidence_assembly_members_evidence_fk
    foreign key (
      organization_id,
      evidence_id,
      evidence_integrity_fingerprint
    )
    references public.hspp_evidence (
      organization_id,
      id,
      integrity_fingerprint
    )
    on delete restrict,

  constraint hspp_evidence_assembly_members_evidence_unique
    unique (
      assembly_id,
      evidence_id
    ),

  constraint hspp_evidence_assembly_members_ordinal_unique
    unique (
      assembly_id,
      member_ordinal
    )
);

create index
  hspp_evidence_assembly_members_org_assembly_idx
on public.hspp_evidence_assembly_members (
  organization_id,
  assembly_id,
  member_ordinal
);

create index
  hspp_evidence_assembly_members_evidence_idx
on public.hspp_evidence_assembly_members (
  organization_id,
  evidence_id
);

alter table public.hspp_evidence_assemblies
  enable row level security;

alter table public.hspp_evidence_assembly_members
  enable row level security;

create policy
  hspp_evidence_assemblies_org_read
on public.hspp_evidence_assemblies
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.organization_id =
        hspp_evidence_assemblies.organization_id
  )
);

create policy
  hspp_evidence_assembly_members_org_read
on public.hspp_evidence_assembly_members
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.organization_id =
        hspp_evidence_assembly_members.organization_id
  )
);

revoke all
on table public.hspp_evidence_assemblies
from public, anon, authenticated, service_role;

revoke all
on table public.hspp_evidence_assembly_members
from public, anon, authenticated, service_role;

grant select
on table public.hspp_evidence_assemblies
to authenticated;

grant select
on table public.hspp_evidence_assembly_members
to authenticated;

grant select, insert, update
on table public.hspp_evidence_assemblies
to service_role;

grant select, insert
on table public.hspp_evidence_assembly_members
to service_role;

-- ----------------------------------------------------------
-- Assembly lifecycle enforcement
-- ----------------------------------------------------------

create or replace function
  public.enforce_hspp_evidence_assembly_update()
returns trigger
language plpgsql
as $$
begin

  -- Once sealed, absolutely no further mutation is allowed.
  if old.assembly_state = 'SEALED' then
    raise exception
      'SEALED HSPP evidence assemblies are immutable.';
  end if;

  -- OPEN assemblies may perform exactly one state transition:
  -- OPEN -> SEALED.
  if
    old.assembly_state <> 'OPEN'
    or new.assembly_state <> 'SEALED'
  then
    raise exception
      'HSPP evidence assemblies permit only OPEN to SEALED transition.';
  end if;

  -- Identity and policy metadata cannot change during sealing.
  if
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.assembly_version is distinct from old.assembly_version
    or new.membership_policy_version is distinct from old.membership_policy_version
    or new.created_at is distinct from old.created_at
  then
    raise exception
      'HSPP assembly identity and policy metadata are immutable.';
  end if;

  if new.sealed_at is null then
    raise exception
      'SEALED HSPP evidence assemblies require sealed_at.';
  end if;

  if not exists (
    select 1
    from public.hspp_evidence_assembly_members members
    where
      members.organization_id =
        old.organization_id
      and members.assembly_id =
        old.id
  ) then
    raise exception
      'Cannot seal an HSPP evidence assembly without members.';
  end if;

  return new;
end;
$$;

create or replace function
  public.prevent_hspp_evidence_assembly_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'HSPP evidence assemblies cannot be deleted.';
end;
$$;

-- ----------------------------------------------------------
-- Membership lifecycle enforcement
-- ----------------------------------------------------------

create or replace function
  public.enforce_hspp_evidence_assembly_member_insert()
returns trigger
language plpgsql
as $$
declare
  current_state text;
begin

  -- Lock the assembly identity while deciding whether membership is
  -- still open. This serializes member admission against OPEN -> SEALED
  -- so no member can cross the sealing boundary concurrently.
  select assembly_state
  into current_state
  from public.hspp_evidence_assemblies
  where
    organization_id = new.organization_id
    and id = new.assembly_id
  for update;

  if current_state is null then
    raise exception
      'Referenced HSPP evidence assembly does not exist.';
  end if;

  if current_state <> 'OPEN' then
    raise exception
      'Cannot add evidence to a SEALED HSPP assembly.';
  end if;

  return new;
end;
$$;

create or replace function
  public.prevent_hspp_evidence_assembly_member_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'HSPP evidence assembly members are immutable and cannot be changed.';
end;
$$;

create trigger
  enforce_hspp_evidence_assembly_update
before update
on public.hspp_evidence_assemblies
for each row
execute function
  public.enforce_hspp_evidence_assembly_update();

create trigger
  prevent_hspp_evidence_assembly_delete
before delete
on public.hspp_evidence_assemblies
for each row
execute function
  public.prevent_hspp_evidence_assembly_delete();

create trigger
  enforce_hspp_evidence_assembly_member_insert
before insert
on public.hspp_evidence_assembly_members
for each row
execute function
  public.enforce_hspp_evidence_assembly_member_insert();

create trigger
  prevent_hspp_evidence_assembly_member_update
before update
on public.hspp_evidence_assembly_members
for each row
execute function
  public.prevent_hspp_evidence_assembly_member_changes();

create trigger
  prevent_hspp_evidence_assembly_member_delete
before delete
on public.hspp_evidence_assembly_members
for each row
execute function
  public.prevent_hspp_evidence_assembly_member_changes();

comment on table
  public.hspp_evidence_assemblies
is
  'HSPP multi-evidence assembly identity. An OPEN assembly accepts immutable evidence members. It may transition exactly once to SEALED, after which both assembly metadata and membership are closed. Assembly existence does not prove that its members describe the same physical event and grants no Route Safety, Crowd, ML, trust, corroboration, contradiction or master-decision authority.';

comment on table
  public.hspp_evidence_assembly_members
is
  'Immutable HSPP assembly membership. Each member binds one organization-scoped HSPP evidence id to its exact SHA-256 integrity fingerprint and deterministic ordinal. Members may be inserted only while the assembly is OPEN.';

comment on column
  public.hspp_evidence_assemblies.membership_policy_version
is
  'Explicit version of the policy that selected evidence membership. B11A1 stores the policy identity only and does not implement that policy.';

comment on column
  public.hspp_evidence_assembly_members.evidence_integrity_fingerprint
is
  'Exact lowercase SHA-256 HSPP evidence fingerprint bound into assembly membership so evidence identity cannot silently drift.';