-- ============================================================
-- B7490-14H1
-- Atomic HSPP descendant reconstruction persistence boundary.
-- ============================================================
--
-- Responsibility:
--
--   Persist one already-decided immutable HSPP reconstruction:
--
--     historical SEALED parent H1
--              |
--              v
--        new OPEN child H2
--
--   while preserving exact composition provenance.
--
-- The caller supplies:
--
-- - organization identity;
-- - exact historical parent assembly identity;
-- - caller-owned child assembly UUID;
-- - assembly / membership / reconstruction policy identities;
-- - reconstruction reason;
-- - the final desired child evidence identities and fingerprints.
--
-- The caller does NOT supply:
--
-- - ORIGINAL versus RETAINED classification;
-- - source_membership_id;
-- - REMOVED / ADDED delta rows.
--
-- Those facts are derived atomically from the immutable parent.
--
-- Deterministic child-member ordering:
--
-- 1. RETAINED members preserve parent member order;
-- 2. ORIGINAL newly-added members follow in evidence-id order.
--
-- Deterministic delta ordering:
--
-- 1. REMOVED parent members in parent member order;
-- 2. ADDED child members in evidence-id order.
--
-- Retry identity:
--
-- The caller-owned child UUID is the immutable reconstruction
-- retry identity.
--
-- An exact retry returns the already-persisted reconstruction.
-- Any conflicting reuse of that child UUID fails closed.
--
-- This boundary deliberately does NOT:
--
-- - select replacement evidence;
-- - evaluate evidence trust;
-- - rerun B11A2;
-- - persist B11A2 pair-relation provenance;
-- - seal the child assembly;
-- - run whole-assembly validation or assessment;
-- - alter historical parent membership;
-- - return removed evidence to Reservoir;
-- - alter Route Safety, Crowd Intelligence or ML authority;
-- - create API, cron, retry scheduler or downstream execution.
-- ============================================================


create or replace function
  public.persist_hspp_evidence_assembly_reconstruction(
    p_organization_id uuid,
    p_parent_assembly_id uuid,
    p_child_assembly_id uuid,
    p_assembly_version text,
    p_membership_policy_version text,
    p_reconstruction_policy_version text,
    p_reconstruction_reason text,
    p_members jsonb
  )
returns table (
  reconstruction_id uuid,
  organization_id uuid,
  parent_assembly_id uuid,
  child_assembly_id uuid,
  assembly_version text,
  membership_policy_version text,
  reconstruction_policy_version text,
  reconstruction_reason text,
  assembly_state text,
  persisted_member_count integer,
  retained_member_count integer,
  original_member_count integer,
  removed_change_count integer,
  added_change_count integer,
  idempotent_recovery boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_state text;
  v_parent_member_count integer;

  v_existing_child
    public.hspp_evidence_assemblies%rowtype;

  v_existing_reconstruction
    public.hspp_evidence_assembly_reconstructions%rowtype;

  v_member jsonb;
  v_evidence_id uuid;
  v_fingerprint text;

  v_member_ids uuid[] :=
    array[]::uuid[];

  v_member_fingerprints text[] :=
    array[]::text[];

  v_member_count integer;
  v_distinct_member_count integer;

  v_lock_evidence_id uuid;

  v_reconstruction_id uuid;

  v_retained_count integer;
  v_original_count integer;
  v_removed_count integer;
  v_added_count integer;

  v_persisted_member_count integer;
begin

  -- ----------------------------------------------------------
  -- Required reconstruction identity.
  -- ----------------------------------------------------------

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if p_parent_assembly_id is null then
    raise exception
      'p_parent_assembly_id is required';
  end if;

  if p_child_assembly_id is null then
    raise exception
      'p_child_assembly_id is required';
  end if;

  if p_parent_assembly_id = p_child_assembly_id then
    raise exception
      'HSPP reconstruction parent and child identities must be distinct.';
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
    p_reconstruction_policy_version is null
    or length(trim(p_reconstruction_policy_version)) = 0
  then
    raise exception
      'p_reconstruction_policy_version is required';
  end if;


  if
    p_reconstruction_reason is null
    or length(trim(p_reconstruction_reason)) = 0
  then
    raise exception
      'p_reconstruction_reason is required';
  end if;


  -- ----------------------------------------------------------
  -- Normalize caller-supplied final child evidence set.
  --
  -- Membership kind and source membership are intentionally
  -- NOT accepted from the caller.
  -- ----------------------------------------------------------

  if
    p_members is null
    or jsonb_typeof(p_members) <> 'array'
  then
    raise exception
      'p_members must be a JSON array';
  end if;


  for v_member in
    select value
    from jsonb_array_elements(p_members)
  loop

    if jsonb_typeof(v_member) <> 'object' then
      raise exception
        'Every HSPP reconstruction member must be a JSON object';
    end if;


    begin
      v_evidence_id :=
        (
          v_member ->> 'evidenceId'
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Every HSPP reconstruction member evidenceId must be a UUID';
    end;


    if v_evidence_id is null then
      raise exception
        'Every HSPP reconstruction member requires evidenceId';
    end if;


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
        'Every HSPP reconstruction member integrityFingerprint must be a lowercase SHA-256 fingerprint';
    end if;


    v_member_ids :=
      array_append(
        v_member_ids,
        v_evidence_id
      );


    v_member_fingerprints :=
      array_append(
        v_member_fingerprints,
        v_fingerprint
      );

  end loop;


  v_member_count :=
    cardinality(v_member_ids);


  if v_member_count < 2 then
    raise exception
      'HSPP reconstructed evidence assembly requires at least two members';
  end if;


  select
    count(
      distinct supplied.evidence_id
    )
  into
    v_distinct_member_count
  from (
    select
      v_member_ids[position]
        as evidence_id
    from
      generate_subscripts(
        v_member_ids,
        1
      ) as position
  ) supplied;


  if
    v_distinct_member_count <>
      v_member_count
  then
    raise exception
      'HSPP reconstructed evidence assembly cannot contain duplicate evidence identities';
  end if;


  -- ----------------------------------------------------------
  -- Lock exact historical parent.
  --
  -- Reconstruction is permitted only from SEALED membership
  -- because H1 must already be historically immutable.
  -- ----------------------------------------------------------

  select
    parent_assembly.assembly_state
  into
    v_parent_state
  from
    public.hspp_evidence_assemblies
      as parent_assembly
  where
    parent_assembly.organization_id =
      p_organization_id
    and parent_assembly.id =
      p_parent_assembly_id
  for update;


  if not found then
    raise exception
      'Referenced HSPP reconstruction parent assembly does not exist for this organization.';
  end if;


  if v_parent_state <> 'SEALED' then
    raise exception
      'HSPP reconstruction requires a SEALED historical parent assembly.';
  end if;


  select
    count(*)
  into
    v_parent_member_count
  from
    public.hspp_evidence_assembly_members
      as parent_member
  where
    parent_member.organization_id =
      p_organization_id
    and parent_member.assembly_id =
      p_parent_assembly_id;


  if v_parent_member_count < 2 then
    raise exception
      'HSPP reconstruction parent must contain at least two immutable members.';
  end if;


  -- ----------------------------------------------------------
  -- Serialize against generic assembly persistence using the
  -- exact existing B07C1/K5 organization/evidence lock identity.
  -- ----------------------------------------------------------

  for v_lock_evidence_id in

    select
      distinct supplied.evidence_id

    from (
      select
        v_member_ids[position]
          as evidence_id
      from
        generate_subscripts(
          v_member_ids,
          1
        ) as position
    ) supplied

    order by
      supplied.evidence_id

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


  -- ----------------------------------------------------------
  -- Every supplied evidence identity/fingerprint must already
  -- exist as exact immutable HSPP evidence.
  -- ----------------------------------------------------------

  if exists (

    with supplied as (
      select
        v_member_ids[position]
          as evidence_id,

        v_member_fingerprints[position]
          as integrity_fingerprint

      from
        generate_subscripts(
          v_member_ids,
          1
        ) as position
    )

    select 1

    from supplied

    where not exists (
      select 1

      from
        public.hspp_evidence
          as evidence

      where
        evidence.organization_id =
          p_organization_id

        and evidence.id =
          supplied.evidence_id

        and evidence.integrity_fingerprint =
          supplied.integrity_fingerprint
    )
  ) then

    raise exception
      'HSPP reconstruction supplied evidence does not exist with the exact immutable fingerprint.';

  end if;


  -- ----------------------------------------------------------
  -- If evidence is retained from H1, its supplied fingerprint
  -- must equal the exact immutable parent membership fingerprint.
  -- ----------------------------------------------------------

  if exists (

    with supplied as (
      select
        v_member_ids[position]
          as evidence_id,

        v_member_fingerprints[position]
          as integrity_fingerprint

      from
        generate_subscripts(
          v_member_ids,
          1
        ) as position
    )

    select 1

    from supplied

    join
      public.hspp_evidence_assembly_members
        as parent_member

      on
        parent_member.organization_id =
          p_organization_id

        and parent_member.assembly_id =
          p_parent_assembly_id

        and parent_member.evidence_id =
          supplied.evidence_id

    where
      parent_member.evidence_integrity_fingerprint <>
        supplied.integrity_fingerprint
  ) then

    raise exception
      'HSPP retained reconstruction evidence fingerprint does not match its exact parent membership.';

  end if;


  -- ----------------------------------------------------------
  -- A member absent from the immediate parent is an ORIGINAL
  -- child addition.
  --
  -- It therefore may not already possess an ORIGINAL membership
  -- elsewhere in this organization.
  -- ----------------------------------------------------------

  if exists (

    with supplied as (
      select
        v_member_ids[position]
          as evidence_id

      from
        generate_subscripts(
          v_member_ids,
          1
        ) as position
    )

    select 1

    from supplied

    where
      not exists (
        select 1

        from
          public.hspp_evidence_assembly_members
            as parent_member

        where
          parent_member.organization_id =
            p_organization_id

          and parent_member.assembly_id =
            p_parent_assembly_id

          and parent_member.evidence_id =
            supplied.evidence_id
      )

      and exists (
        select 1

        from
          public.hspp_evidence_assembly_members
            as existing_original

        where
          existing_original.organization_id =
            p_organization_id

          and existing_original.evidence_id =
            supplied.evidence_id

          and existing_original.assembly_id <>
            p_child_assembly_id

          and existing_original.membership_kind =
            'ORIGINAL'
      )
  ) then

    raise exception
      'New HSPP reconstruction evidence already has an ORIGINAL assembly membership.';

  end if;


  -- ----------------------------------------------------------
  -- Derive exact reconstruction counts before any mutation.
  -- ----------------------------------------------------------

  select
    count(*)
  into
    v_removed_count
  from
    public.hspp_evidence_assembly_members
      as parent_member
  where
    parent_member.organization_id =
      p_organization_id

    and parent_member.assembly_id =
      p_parent_assembly_id

    and not (
      parent_member.evidence_id =
        any(v_member_ids)
    );


  with supplied as (
    select
      v_member_ids[position]
        as evidence_id

    from
      generate_subscripts(
        v_member_ids,
        1
      ) as position
  )
  select
    count(*)
  into
    v_added_count
  from supplied
  where
    not exists (
      select 1

      from
        public.hspp_evidence_assembly_members
          as parent_member

      where
        parent_member.organization_id =
          p_organization_id

        and parent_member.assembly_id =
          p_parent_assembly_id

        and parent_member.evidence_id =
          supplied.evidence_id
    );


  v_original_count :=
    v_added_count;


  v_retained_count :=
    v_member_count -
    v_original_count;


  if
    v_removed_count +
    v_added_count =
    0
  then
    raise exception
      'HSPP reconstruction requires at least one REMOVED or ADDED composition change.';
  end if;


  -- ----------------------------------------------------------
  -- Caller-owned child UUID is the retry identity.
  --
  -- If the child already exists, recover only if every immutable
  -- reconstruction fact exactly matches this request.
  -- ----------------------------------------------------------

  select
    child_assembly.*
  into
    v_existing_child
  from
    public.hspp_evidence_assemblies
      as child_assembly
  where
    child_assembly.id =
      p_child_assembly_id
  for update;


  if found then

    if
      v_existing_child.organization_id <>
        p_organization_id
    then
      raise exception
        'HSPP reconstruction child UUID already belongs to another organization.';
    end if;


    if
      v_existing_child.assembly_version <>
        trim(p_assembly_version)

      or
      v_existing_child.membership_policy_version <>
        trim(p_membership_policy_version)
    then
      raise exception
        'Existing HSPP reconstruction child conflicts with requested assembly metadata.';
    end if;


    select
      reconstruction.*
    into
      v_existing_reconstruction
    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
    where
      reconstruction.organization_id =
        p_organization_id

      and reconstruction.child_assembly_id =
        p_child_assembly_id;


    if not found then
      raise exception
        'Existing HSPP child assembly is not owned by reconstruction provenance.';
    end if;


    if
      v_existing_reconstruction.parent_assembly_id <>
        p_parent_assembly_id

      or
      v_existing_reconstruction.reconstruction_policy_version <>
        trim(p_reconstruction_policy_version)

      or
      v_existing_reconstruction.reconstruction_reason <>
        trim(p_reconstruction_reason)
    then
      raise exception
        'Existing HSPP reconstruction provenance conflicts with this retry.';
    end if;


    -- Exact canonical child membership comparison.

    if exists (

      with supplied as (
        select
          v_member_ids[position]
            as evidence_id,

          v_member_fingerprints[position]
            as integrity_fingerprint

        from
          generate_subscripts(
            v_member_ids,
            1
          ) as position
      ),

      classified as (
        select
          supplied.evidence_id,
          supplied.integrity_fingerprint,

          parent_member.id
            as source_membership_id,

          parent_member.member_ordinal
            as parent_member_ordinal,

          case
            when parent_member.id is null
              then 'ORIGINAL'::text
            else 'RETAINED'::text
          end
            as membership_kind

        from supplied

        left join
          public.hspp_evidence_assembly_members
            as parent_member

          on
            parent_member.organization_id =
              p_organization_id

            and parent_member.assembly_id =
              p_parent_assembly_id

            and parent_member.evidence_id =
              supplied.evidence_id
      ),

      expected_members as (
        select
          classified.evidence_id,
          classified.integrity_fingerprint,

          (
            row_number() over (
              order by
                case
                  when classified.source_membership_id is null
                    then 1
                  else 0
                end,

                classified.parent_member_ordinal
                  nulls last,

                classified.evidence_id
            )
          )::integer
            as member_ordinal,

          classified.membership_kind,
          classified.source_membership_id

        from classified
      ),

      actual_members as (
        select
          member.evidence_id,

          member.evidence_integrity_fingerprint
            as integrity_fingerprint,

          member.member_ordinal,
          member.membership_kind,
          member.source_membership_id

        from
          public.hspp_evidence_assembly_members
            as member

        where
          member.organization_id =
            p_organization_id

          and member.assembly_id =
            p_child_assembly_id
      ),

      differences as (

        (
          select
            expected_members.evidence_id,
            expected_members.integrity_fingerprint,
            expected_members.member_ordinal,
            expected_members.membership_kind,
            expected_members.source_membership_id
          from expected_members

          except

          select
            actual_members.evidence_id,
            actual_members.integrity_fingerprint,
            actual_members.member_ordinal,
            actual_members.membership_kind,
            actual_members.source_membership_id
          from actual_members
        )

        union all

        (
          select
            actual_members.evidence_id,
            actual_members.integrity_fingerprint,
            actual_members.member_ordinal,
            actual_members.membership_kind,
            actual_members.source_membership_id
          from actual_members

          except

          select
            expected_members.evidence_id,
            expected_members.integrity_fingerprint,
            expected_members.member_ordinal,
            expected_members.membership_kind,
            expected_members.source_membership_id
          from expected_members
        )
      )

      select 1
      from differences
      limit 1

    ) then

      raise exception
        'Existing HSPP reconstruction child membership conflicts with this retry.';

    end if;


    -- Exact deterministic reconstruction-delta comparison.

    if exists (

      with supplied as (
        select
          v_member_ids[position]
            as evidence_id,

          v_member_fingerprints[position]
            as integrity_fingerprint

        from
          generate_subscripts(
            v_member_ids,
            1
          ) as position
      ),

      expected_removed as (
        select
          (
            row_number() over (
              order by
                parent_member.member_ordinal,
                parent_member.evidence_id
            )
          )::integer
            as change_ordinal,

          'REMOVED'::text
            as change_kind,

          parent_member.evidence_id,

          parent_member.evidence_integrity_fingerprint
            as integrity_fingerprint

        from
          public.hspp_evidence_assembly_members
            as parent_member

        where
          parent_member.organization_id =
            p_organization_id

          and parent_member.assembly_id =
            p_parent_assembly_id

          and not (
            parent_member.evidence_id =
              any(v_member_ids)
          )
      ),

      expected_added as (
        select
          v_removed_count +
          (
            row_number() over (
              order by
                supplied.evidence_id
            )
          )::integer
            as change_ordinal,

          'ADDED'::text
            as change_kind,

          supplied.evidence_id,
          supplied.integrity_fingerprint

        from supplied

        where
          not exists (
            select 1

            from
              public.hspp_evidence_assembly_members
                as parent_member

            where
              parent_member.organization_id =
                p_organization_id

              and parent_member.assembly_id =
                p_parent_assembly_id

              and parent_member.evidence_id =
                supplied.evidence_id
          )
      ),

      expected_changes as (
        select * from expected_removed
        union all
        select * from expected_added
      ),

      actual_changes as (
        select
          reconstruction_change.change_ordinal,
          reconstruction_change.change_kind,
          reconstruction_change.evidence_id,

          reconstruction_change.evidence_integrity_fingerprint
            as integrity_fingerprint

        from
          public.hspp_evidence_assembly_reconstruction_changes
            as reconstruction_change

        where
          reconstruction_change.organization_id =
            p_organization_id

          and reconstruction_change.reconstruction_id =
            v_existing_reconstruction.id
      ),

      differences as (

        (
          select
            expected_changes.change_ordinal,
            expected_changes.change_kind,
            expected_changes.evidence_id,
            expected_changes.integrity_fingerprint
          from expected_changes

          except

          select
            actual_changes.change_ordinal,
            actual_changes.change_kind,
            actual_changes.evidence_id,
            actual_changes.integrity_fingerprint
          from actual_changes
        )

        union all

        (
          select
            actual_changes.change_ordinal,
            actual_changes.change_kind,
            actual_changes.evidence_id,
            actual_changes.integrity_fingerprint
          from actual_changes

          except

          select
            expected_changes.change_ordinal,
            expected_changes.change_kind,
            expected_changes.evidence_id,
            expected_changes.integrity_fingerprint
          from expected_changes
        )
      )

      select 1
      from differences
      limit 1

    ) then

      raise exception
        'Existing HSPP reconstruction delta conflicts with this retry.';

    end if;


    return query
    select
      v_existing_reconstruction.id,

      p_organization_id,
      p_parent_assembly_id,
      p_child_assembly_id,

      trim(p_assembly_version),
      trim(p_membership_policy_version),
      trim(p_reconstruction_policy_version),
      trim(p_reconstruction_reason),

      v_existing_child.assembly_state,

      v_member_count,
      v_retained_count,
      v_original_count,
      v_removed_count,
      v_added_count,

      true;

    return;

  end if;


  -- ----------------------------------------------------------
  -- New reconstruction.
  --
  -- Required transaction order:
  --
  --   child OPEN
  --   -> reconstruction header
  --   -> child membership
  --   -> exact derived delta
  -- ----------------------------------------------------------

  insert into public.hspp_evidence_assemblies (
    id,
    organization_id,
    assembly_version,
    membership_policy_version,
    assembly_state
  )
  values (
    p_child_assembly_id,
    p_organization_id,
    trim(p_assembly_version),
    trim(p_membership_policy_version),
    'OPEN'
  );


  insert into
    public.hspp_evidence_assembly_reconstructions (
      organization_id,
      parent_assembly_id,
      child_assembly_id,
      reconstruction_policy_version,
      reconstruction_reason
    )
  values (
    p_organization_id,
    p_parent_assembly_id,
    p_child_assembly_id,
    trim(p_reconstruction_policy_version),
    trim(p_reconstruction_reason)
  )
  returning id
  into v_reconstruction_id;


  -- ----------------------------------------------------------
  -- Derive ORIGINAL versus RETAINED inside the authority.
  --
  -- A member present in the immediate parent is RETAINED and
  -- points to that exact immutable parent membership row.
  --
  -- A member absent from the parent is ORIGINAL.
  -- ----------------------------------------------------------

  with supplied as (
    select
      v_member_ids[position]
        as evidence_id,

      v_member_fingerprints[position]
        as integrity_fingerprint

    from
      generate_subscripts(
        v_member_ids,
        1
      ) as position
  ),

  classified as (
    select
      supplied.evidence_id,
      supplied.integrity_fingerprint,

      parent_member.id
        as source_membership_id,

      parent_member.member_ordinal
        as parent_member_ordinal,

      case
        when parent_member.id is null
          then 'ORIGINAL'::text
        else 'RETAINED'::text
      end
        as membership_kind

    from supplied

    left join
      public.hspp_evidence_assembly_members
        as parent_member

      on
        parent_member.organization_id =
          p_organization_id

        and parent_member.assembly_id =
          p_parent_assembly_id

        and parent_member.evidence_id =
          supplied.evidence_id
  ),

  ordered_members as (
    select
      classified.evidence_id,
      classified.integrity_fingerprint,
      classified.membership_kind,
      classified.source_membership_id,

      (
        row_number() over (
          order by
            case
              when classified.source_membership_id is null
                then 1
              else 0
            end,

            classified.parent_member_ordinal
              nulls last,

            classified.evidence_id
        )
      )::integer
        as member_ordinal

    from classified
  )

  insert into
    public.hspp_evidence_assembly_members (
      organization_id,
      assembly_id,
      evidence_id,
      evidence_integrity_fingerprint,
      member_ordinal,
      membership_kind,
      source_membership_id
    )

  select
    p_organization_id,
    p_child_assembly_id,
    ordered_members.evidence_id,
    ordered_members.integrity_fingerprint,
    ordered_members.member_ordinal,
    ordered_members.membership_kind,
    ordered_members.source_membership_id

  from ordered_members

  order by
    ordered_members.member_ordinal;


  get diagnostics
    v_persisted_member_count =
      row_count;


  if
    v_persisted_member_count <>
      v_member_count
  then
    raise exception
      'HSPP reconstruction failed to persist the complete child membership set.';
  end if;


  -- ----------------------------------------------------------
  -- Derive REMOVED provenance as exact parent minus child.
  -- ----------------------------------------------------------

  insert into
    public.hspp_evidence_assembly_reconstruction_changes (
      organization_id,
      reconstruction_id,
      change_ordinal,
      change_kind,
      evidence_id,
      evidence_integrity_fingerprint
    )

  select
    p_organization_id,
    v_reconstruction_id,

    (
      row_number() over (
        order by
          parent_member.member_ordinal,
          parent_member.evidence_id
      )
    )::integer,

    'REMOVED',

    parent_member.evidence_id,
    parent_member.evidence_integrity_fingerprint

  from
    public.hspp_evidence_assembly_members
      as parent_member

  where
    parent_member.organization_id =
      p_organization_id

    and parent_member.assembly_id =
      p_parent_assembly_id

    and not (
      parent_member.evidence_id =
        any(v_member_ids)
    )

  order by
    parent_member.member_ordinal,
    parent_member.evidence_id;


  -- ----------------------------------------------------------
  -- Derive ADDED provenance as exact child minus parent.
  -- ----------------------------------------------------------

  with supplied as (
    select
      v_member_ids[position]
        as evidence_id,

      v_member_fingerprints[position]
        as integrity_fingerprint

    from
      generate_subscripts(
        v_member_ids,
        1
      ) as position
  ),

  added as (
    select
      supplied.evidence_id,
      supplied.integrity_fingerprint,

      (
        row_number() over (
          order by
            supplied.evidence_id
        )
      )::integer
        as added_ordinal

    from supplied

    where
      not exists (
        select 1

        from
          public.hspp_evidence_assembly_members
            as parent_member

        where
          parent_member.organization_id =
            p_organization_id

          and parent_member.assembly_id =
            p_parent_assembly_id

          and parent_member.evidence_id =
            supplied.evidence_id
      )
  )

  insert into
    public.hspp_evidence_assembly_reconstruction_changes (
      organization_id,
      reconstruction_id,
      change_ordinal,
      change_kind,
      evidence_id,
      evidence_integrity_fingerprint
    )

  select
    p_organization_id,
    v_reconstruction_id,

    v_removed_count +
      added.added_ordinal,

    'ADDED',

    added.evidence_id,
    added.integrity_fingerprint

  from added

  order by
    added.added_ordinal;


  return query
  select
    v_reconstruction_id,

    p_organization_id,
    p_parent_assembly_id,
    p_child_assembly_id,

    trim(p_assembly_version),
    trim(p_membership_policy_version),
    trim(p_reconstruction_policy_version),
    trim(p_reconstruction_reason),

    'OPEN'::text,

    v_member_count,
    v_retained_count,
    v_original_count,
    v_removed_count,
    v_added_count,

    false;

end;
$$;


-- PostgreSQL grants PUBLIC execute to functions by default.
-- Keep this mutation boundary service-role only.

revoke all
on function
  public.persist_hspp_evidence_assembly_reconstruction(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
from
  public,
  anon,
  authenticated,
  service_role;


grant execute
on function
  public.persist_hspp_evidence_assembly_reconstruction(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
to service_role;


comment on function
  public.persist_hspp_evidence_assembly_reconstruction(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    jsonb
  )
is
  'B7490-14H1 atomic HSPP descendant reconstruction persistence authority. Locks one exact historical SEALED parent, uses a caller-owned child UUID as immutable retry identity, creates one OPEN child, persists immediate parent-child reconstruction provenance, derives RETAINED versus ORIGINAL child membership from exact parent membership, and derives immutable REMOVED/ADDED composition delta provenance. Exact retries recover the already-persisted child; conflicting retries fail closed. It does not select replacement evidence, rerun membership evaluation, persist pair-relation provenance, seal or assess the child, mutate H1, return evidence to Reservoir, alter trust, or grant downstream authority.';
