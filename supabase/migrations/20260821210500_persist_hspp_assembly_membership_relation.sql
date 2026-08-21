-- B7490-07K5
-- Immutable B11A2 assembly-membership relation provenance.
--
-- Purpose:
-- Preserve the exact already-computed B11A2 pair decision that admitted
-- the current deterministic two-member Reservoir pair into an HSPP
-- evidence assembly.
--
-- This migration does NOT execute B11A2.
-- It does NOT infer or fabricate historical provenance.
-- It does NOT implement corroboration, contradiction, B11F4, B11F5,
-- trust promotion or downstream authority.

create table public.hspp_evidence_assembly_membership_relations (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  assembly_id uuid not null,

  first_evidence_id uuid not null,

  second_evidence_id uuid not null,

  membership_eligible boolean not null,

  membership_policy_version text not null,

  membership_reason text not null,

  distance_meters double precision null,

  time_delta_ms bigint null,

  created_at timestamptz not null
    default now(),

  constraint hspp_evidence_assembly_membership_relations_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_assembly_membership_relation_distinct_evidence
    check (
      first_evidence_id <> second_evidence_id
    ),

  constraint hspp_assembly_membership_relation_policy_not_blank
    check (
      length(trim(membership_policy_version)) > 0
    ),

  constraint hspp_assembly_membership_relation_reason_not_blank
    check (
      length(trim(membership_reason)) > 0
    ),

  constraint hspp_assembly_membership_relation_distance_nonnegative
    check (
      distance_meters is null
      or distance_meters >= 0
    ),

  constraint hspp_assembly_membership_relation_time_nonnegative
    check (
      time_delta_ms is null
      or time_delta_ms >= 0
    ),

  constraint hspp_assembly_membership_relation_one_per_assembly
    unique (
      organization_id,
      assembly_id
    )
);


create index
  hspp_assembly_membership_relations_evidence_pair_idx
on public.hspp_evidence_assembly_membership_relations (
  organization_id,
  first_evidence_id,
  second_evidence_id
);


alter table
  public.hspp_evidence_assembly_membership_relations
enable row level security;


create policy
  hspp_evidence_assembly_membership_relations_org_read
on public.hspp_evidence_assembly_membership_relations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.organization_id =
        hspp_evidence_assembly_membership_relations.organization_id
  )
);


revoke all
on table public.hspp_evidence_assembly_membership_relations
from public, anon, authenticated, service_role;


grant select
on table public.hspp_evidence_assembly_membership_relations
to authenticated;


grant select, insert
on table public.hspp_evidence_assembly_membership_relations
to service_role;


-- ------------------------------------------------------------
-- Relation insertion guard.
--
-- The pair must reference members already inserted into this exact
-- organization-scoped assembly.
-- ------------------------------------------------------------

create or replace function
  public.enforce_hspp_evidence_assembly_membership_relation_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_assembly_state text;
begin

  select assembly_state
  into v_assembly_state
  from public.hspp_evidence_assemblies
  where
    organization_id = new.organization_id
    and id = new.assembly_id
  for update;

  if v_assembly_state is null then
    raise exception
      'Referenced HSPP evidence assembly does not exist.';
  end if;

  if v_assembly_state <> 'OPEN' then
    raise exception
      'Cannot add membership provenance to a SEALED HSPP evidence assembly.';
  end if;

  if not exists (
    select 1
    from public.hspp_evidence_assembly_members
    where
      organization_id = new.organization_id
      and assembly_id = new.assembly_id
      and evidence_id = new.first_evidence_id
  ) then
    raise exception
      'First membership relation evidence is not a member of the assembly.';
  end if;

  if not exists (
    select 1
    from public.hspp_evidence_assembly_members
    where
      organization_id = new.organization_id
      and assembly_id = new.assembly_id
      and evidence_id = new.second_evidence_id
  ) then
    raise exception
      'Second membership relation evidence is not a member of the assembly.';
  end if;

  return new;
end;
$$;


create or replace function
  public.prevent_hspp_evidence_assembly_membership_relation_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'HSPP evidence assembly membership provenance is immutable.';
end;
$$;


create trigger
  enforce_hspp_evidence_assembly_membership_relation_insert
before insert
on public.hspp_evidence_assembly_membership_relations
for each row
execute function
  public.enforce_hspp_evidence_assembly_membership_relation_insert();


create trigger
  prevent_hspp_evidence_assembly_membership_relation_update
before update
on public.hspp_evidence_assembly_membership_relations
for each row
execute function
  public.prevent_hspp_evidence_assembly_membership_relation_changes();


create trigger
  prevent_hspp_evidence_assembly_membership_relation_delete
before delete
on public.hspp_evidence_assembly_membership_relations
for each row
execute function
  public.prevent_hspp_evidence_assembly_membership_relation_changes();


-- ------------------------------------------------------------
-- Upgrade B07C1 atomic persistence.
--
-- A fifth parameter carries optional pair provenance.
-- It defaults to NULL so historical/generic callers are not forced to
-- fabricate a relation they do not possess.
--
-- B07C2 now supplies this parameter.
-- ------------------------------------------------------------

create or replace function public.persist_hspp_evidence_assembly(
  p_organization_id uuid,
  p_assembly_version text,
  p_membership_policy_version text,
  p_members jsonb,
  p_membership_relation jsonb default null
)
returns table (
  assembly_id uuid,
  organization_id uuid,
  assembly_version text,
  membership_policy_version text,
  assembly_state text,
  persisted_member_count integer,
  persisted_membership_relation_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assembly_id uuid;

  v_member_count integer;
  v_distinct_evidence_count integer;

  v_member jsonb;
  v_ordinal integer := 0;

  v_evidence_id uuid;
  v_fingerprint text;

  v_lock_evidence_id uuid;
  v_existing_membership record;

  v_first_evidence_id uuid;
  v_second_evidence_id uuid;

  v_relation_policy_version text;
  v_relation_reason text;

  v_relation_distance double precision;
  v_relation_time_delta bigint;

  v_relation_count integer := 0;
begin

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if
    p_assembly_version is null
    or length(trim(p_assembly_version)) = 0
  then
    raise exception
      'p_assembly_version is required';
  end if;

  if
    p_membership_policy_version is null
    or length(trim(p_membership_policy_version)) = 0
  then
    raise exception
      'p_membership_policy_version is required';
  end if;

  if
    p_members is null
    or jsonb_typeof(p_members) <> 'array'
  then
    raise exception
      'p_members must be a JSON array';
  end if;

  v_member_count :=
    jsonb_array_length(p_members);

  if v_member_count < 2 then
    raise exception
      'HSPP evidence assembly requires at least two members';
  end if;


  select
    count(
      distinct item ->> 'evidenceId'
    )
  into v_distinct_evidence_count
  from jsonb_array_elements(
    p_members
  ) item;

  if
    v_distinct_evidence_count <>
      v_member_count
  then
    raise exception
      'HSPP evidence assembly cannot contain duplicate evidence identities';
  end if;


  -- Validate every member before taking locks or writing.

  for v_member in
    select value
    from jsonb_array_elements(
      p_members
    )
  loop

    if
      v_member ->> 'evidenceId' is null
      or length(
        trim(
          v_member ->> 'evidenceId'
        )
      ) = 0
    then
      raise exception
        'HSPP assembly member evidenceId is required';
    end if;

    begin
      v_evidence_id :=
        (
          v_member ->> 'evidenceId'
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'HSPP assembly member evidenceId must be a UUID';
    end;

    v_fingerprint :=
      trim(
        coalesce(
          v_member ->> 'integrityFingerprint',
          ''
        )
      );

    if
      v_fingerprint !~
        '^[0-9a-f]{64}$'
    then
      raise exception
        'HSPP assembly member integrityFingerprint must be a lowercase SHA-256 fingerprint';
    end if;

  end loop;


  -- Validate supplied authoritative B11A2 relation without recomputing it.

  if p_membership_relation is not null then

    if
      jsonb_typeof(p_membership_relation) <>
        'object'
    then
      raise exception
        'p_membership_relation must be a JSON object';
    end if;

    if v_member_count <> 2 then
      raise exception
        'B7490-07K5 membership provenance currently requires exactly two assembly members';
    end if;

    begin
      v_first_evidence_id :=
        (
          p_membership_relation
            ->> 'firstEvidenceId'
        )::uuid;

      v_second_evidence_id :=
        (
          p_membership_relation
            ->> 'secondEvidenceId'
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'HSPP membership relation evidence IDs must be UUIDs';
    end;

    if
      v_first_evidence_id is null
      or v_second_evidence_id is null
    then
      raise exception
        'HSPP membership relation requires both evidence identities';
    end if;

    if
      v_first_evidence_id =
        v_second_evidence_id
    then
      raise exception
        'HSPP membership relation requires distinct evidence identities';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(
        p_members
      ) item
      where
        (
          item ->> 'evidenceId'
        )::uuid =
          v_first_evidence_id
    ) then
      raise exception
        'First membership relation evidence is not present in p_members';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(
        p_members
      ) item
      where
        (
          item ->> 'evidenceId'
        )::uuid =
          v_second_evidence_id
    ) then
      raise exception
        'Second membership relation evidence is not present in p_members';
    end if;

    if
      p_membership_relation
        -> 'membershipEligible'
      is distinct from
        'true'::jsonb
    then
      raise exception
        'Persisted HSPP assembly membership relation must be eligible';
    end if;

    v_relation_policy_version :=
      trim(
        coalesce(
          p_membership_relation
            ->> 'membershipPolicyVersion',
          ''
        )
      );

    if
      v_relation_policy_version <>
        trim(
          p_membership_policy_version
        )
    then
      raise exception
        'Membership relation policy version must match assembly policy version';
    end if;

    v_relation_reason :=
      trim(
        coalesce(
          p_membership_relation
            ->> 'membershipReason',
          ''
        )
      );

    if v_relation_reason <> 'ELIGIBLE' then
      raise exception
        'Eligible membership relation must preserve reason ELIGIBLE';
    end if;

    if
      p_membership_relation ? 'distanceMeters'
      and
      p_membership_relation
        -> 'distanceMeters'
        <> 'null'::jsonb
    then
      begin
        v_relation_distance :=
          (
            p_membership_relation
              ->> 'distanceMeters'
          )::double precision;
      exception
        when invalid_text_representation then
          raise exception
            'Membership relation distanceMeters must be numeric or null';
      end;

      if v_relation_distance < 0 then
        raise exception
          'Membership relation distanceMeters cannot be negative';
      end if;
    else
      v_relation_distance := null;
    end if;

    if
      p_membership_relation ? 'timeDeltaMs'
      and
      p_membership_relation
        -> 'timeDeltaMs'
        <> 'null'::jsonb
    then
      begin
        v_relation_time_delta :=
          (
            p_membership_relation
              ->> 'timeDeltaMs'
          )::bigint;
      exception
        when invalid_text_representation then
          raise exception
            'Membership relation timeDeltaMs must be an integer or null';
      end;

      if v_relation_time_delta < 0 then
        raise exception
          'Membership relation timeDeltaMs cannot be negative';
      end if;
    else
      v_relation_time_delta := null;
    end if;

  end if;


  -- Existing B07C1a deterministic evidence claim locks.

  for v_lock_evidence_id in

    select
      distinct (
        item ->> 'evidenceId'
      )::uuid as evidence_id

    from jsonb_array_elements(
      p_members
    ) item

    order by evidence_id

  loop

    perform pg_advisory_xact_lock(
      hashtextextended(
        'harborguard:hspp-evidence-assembly-membership:' ||
        p_organization_id::text ||
        ':' ||
        v_lock_evidence_id::text,
        0
      )
    );

  end loop;


  -- Re-check existing assembly ownership after locks.

  select
    members.evidence_id,
    members.assembly_id

  into v_existing_membership

  from public.hspp_evidence_assembly_members
    as members

  where
    members.organization_id =
      p_organization_id

    and members.evidence_id in (
      select
        (
          item ->> 'evidenceId'
        )::uuid

      from jsonb_array_elements(
        p_members
      ) item
    )

  order by
    members.evidence_id,
    members.assembly_id

  limit 1;


  if found then
    raise exception
      'HSPP evidence % is already assembled in assembly %.',
      v_existing_membership.evidence_id,
      v_existing_membership.assembly_id;
  end if;


  -- Create OPEN assembly.

  insert into public.hspp_evidence_assemblies (
    organization_id,
    assembly_version,
    membership_policy_version,
    assembly_state
  )
  values (
    p_organization_id,
    trim(
      p_assembly_version
    ),
    trim(
      p_membership_policy_version
    ),
    'OPEN'
  )
  returning id
  into v_assembly_id;


  -- Persist immutable members.

  for v_member in
    select value
    from jsonb_array_elements(
      p_members
    )
  loop

    v_ordinal :=
      v_ordinal + 1;

    v_evidence_id :=
      (
        v_member ->> 'evidenceId'
      )::uuid;

    v_fingerprint :=
      trim(
        v_member
          ->> 'integrityFingerprint'
      );

    insert into public.hspp_evidence_assembly_members (
      organization_id,
      assembly_id,
      evidence_id,
      evidence_integrity_fingerprint,
      member_ordinal
    )
    values (
      p_organization_id,
      v_assembly_id,
      v_evidence_id,
      v_fingerprint,
      v_ordinal
    );

  end loop;


  -- Persist the exact supplied B11A2 relation in the same transaction.

  if p_membership_relation is not null then

    insert into
      public.hspp_evidence_assembly_membership_relations (
        organization_id,
        assembly_id,
        first_evidence_id,
        second_evidence_id,
        membership_eligible,
        membership_policy_version,
        membership_reason,
        distance_meters,
        time_delta_ms
      )
    values (
      p_organization_id,
      v_assembly_id,
      v_first_evidence_id,
      v_second_evidence_id,
      true,
      v_relation_policy_version,
      v_relation_reason,
      v_relation_distance,
      v_relation_time_delta
    );

    v_relation_count := 1;

  end if;


  return query
  select
    assembly.id,
    assembly.organization_id,
    assembly.assembly_version,
    assembly.membership_policy_version,
    assembly.assembly_state,
    v_member_count,
    v_relation_count

  from public.hspp_evidence_assemblies
    as assembly

  where
    assembly.organization_id =
      p_organization_id

    and assembly.id =
      v_assembly_id;

end;
$$;


-- Remove the previous exact four-argument overload.
-- The new fifth argument has DEFAULT NULL, so four-argument SQL callers
-- can still resolve to the upgraded function without leaving two
-- competing implementations.

drop function if exists
  public.persist_hspp_evidence_assembly(
    uuid,
    text,
    text,
    jsonb
  );


revoke all
on function public.persist_hspp_evidence_assembly(
  uuid,
  text,
  text,
  jsonb,
  jsonb
)
from
  public,
  anon,
  authenticated;


grant execute
on function public.persist_hspp_evidence_assembly(
  uuid,
  text,
  text,
  jsonb,
  jsonb
)
to service_role;


comment on table
  public.hspp_evidence_assembly_membership_relations
is
  'B7490-07K5 immutable provenance for the exact B11A2 pair decision supplied during atomic evidence-assembly creation. Relation existence proves only assembly-membership eligibility under the recorded policy and grants no corroboration, trust or downstream authority.';


comment on function
  public.persist_hspp_evidence_assembly(
    uuid,
    text,
    text,
    jsonb,
    jsonb
  )
is
  'B7490-07K5 atomic HSPP assembly persistence boundary. Creates an OPEN assembly, immutable initial members, and when supplied the exact already-computed B11A2 pair provenance in one PostgreSQL transaction. It does not execute B11A2, establish corroboration, alter trust or grant downstream authority.';
