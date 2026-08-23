-- ============================================================
-- B7490-14AB1
-- Immutable currently-effective assembly-membership cessation
-- authority substrate.
--
-- This relation records one new lifecycle fact:
--
--   an exact immutable historical assembly membership has ceased
--   to be CURRENTLY EFFECTIVE because its exact Q14v post-positive
--   unsuitability checkpoint authorizes exclusion from the next
--   composition.
--
-- Historical membership remains untouched forever.
--
-- The cessation:
-- - binds one exact Q14v unsuitability checkpoint;
-- - binds one exact immutable historical membership row;
-- - derives organization / assembly / evidence / fingerprint from
--   those existing immutable facts;
-- - derives ceased_at from Q14v decided_at;
-- - requires the target assembly to be the current reconstruction
--   lineage leaf when a new cessation is created;
-- - is append-only and immutable.
--
-- This migration deliberately does NOT:
-- - mutate or delete historical membership;
-- - mutate or revoke Q14p/Q14r positive provenance;
-- - mutate Q14v;
-- - mutate evidence trust or operational eligibility;
-- - return evidence to Reservoir;
-- - select replacement evidence;
-- - create H2;
-- - persist REMOVED / RETAINED / ADDED reconstruction provenance;
-- - run reconstruction;
-- - validate a descendant composite;
-- - create runtime writer/evaluator/orchestration.
-- ============================================================

begin;


create table
  public.hspp_assembly_member_effective_cessations
(
  id uuid
    primary key
    default gen_random_uuid(),

  organization_id uuid
    not null,

  assembly_id uuid
    not null,

  evidence_id uuid
    not null,

  integrity_fingerprint text
    not null,

  historical_membership_id uuid
    not null,

  unsuitability_checkpoint_id uuid
    not null,

  cessation_version text
    not null
    default
      'hspp-assembly-member-effective-cessation-v1',

  cessation_policy_version text
    not null
    default
      'hspp-post-positive-effective-membership-cessation-v1',

  cessation_reason text
    not null
    default
      'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP',

  ceased_at timestamptz
    not null,

  created_at timestamptz
    not null
    default now(),


  constraint hspp_effective_cessation_org_fk
    foreign key (
      organization_id
    )
    references
      public.organizations (
        id
      )
    on delete restrict,


  constraint hspp_effective_cessation_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references
      public.hspp_evidence_assemblies (
        organization_id,
        id
      )
    on delete restrict,


  constraint hspp_effective_cessation_evidence_fk
    foreign key (
      organization_id,
      evidence_id,
      integrity_fingerprint
    )
    references
      public.hspp_evidence (
        organization_id,
        id,
        integrity_fingerprint
      )
    on delete restrict,


  constraint hspp_effective_cessation_membership_fk
    foreign key (
      historical_membership_id
    )
    references
      public.hspp_evidence_assembly_members (
        id
      )
    on delete restrict,


  constraint hspp_effective_cessation_unsuitability_fk
    foreign key (
      unsuitability_checkpoint_id
    )
    references
      public.hspp_assembly_member_unsuitability_checkpoints (
        id
      )
    on delete restrict,


  constraint hspp_effective_cessation_unsuitability_unique
    unique (
      unsuitability_checkpoint_id
    ),


  constraint hspp_effective_cessation_membership_unique
    unique (
      historical_membership_id
    ),


  constraint hspp_effective_cessation_member_unique
    unique (
      organization_id,
      assembly_id,
      evidence_id
    ),


  constraint hspp_effective_cessation_fingerprint_sha256
    check (
      integrity_fingerprint ~ '^[a-f0-9]{64}$'
    ),


  constraint hspp_effective_cessation_version_exact
    check (
      cessation_version =
        'hspp-assembly-member-effective-cessation-v1'
    ),


  constraint hspp_effective_cessation_policy_exact
    check (
      cessation_policy_version =
        'hspp-post-positive-effective-membership-cessation-v1'
    ),


  constraint hspp_effective_cessation_reason_exact
    check (
      cessation_reason =
        'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP'
    )
);


create index
  hspp_effective_cessation_org_evidence_idx
on
  public.hspp_assembly_member_effective_cessations (
    organization_id,
    evidence_id,
    assembly_id
  );


create or replace function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_checkpoint
    public.hspp_assembly_member_unsuitability_checkpoints%rowtype;

  v_membership
    public.hspp_evidence_assembly_members%rowtype;

  v_assembly_state text;
begin

  if new.unsuitability_checkpoint_id is null then
    raise exception
      'Q14ab requires one exact Q14v unsuitability checkpoint id.';
  end if;


  select
    checkpoint.*
  into
    v_checkpoint
  from
    public.hspp_assembly_member_unsuitability_checkpoints
      as checkpoint
  where
    checkpoint.id =
      new.unsuitability_checkpoint_id
  for key share;


  if not found then
    raise exception
      'Q14ab referenced Q14v unsuitability checkpoint does not exist.';
  end if;


  if
    v_checkpoint.checkpoint_version <>
      'hspp-assembly-member-unsuitability-checkpoint-v1'

    or

    v_checkpoint.unsuitability_policy_version <>
      'hspp-post-positive-member-unsuitability-v1'

    or

    v_checkpoint.unsuitability_reason <>
      'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'
  then
    raise exception
      'Q14ab requires the exact canonical Q14v post-positive unsuitability authority.';
  end if;


  /*
   * Serialize a new cessation against Q14h reconstruction of the
   * same historical parent.
   *
   * Q14h locks the historical parent FOR UPDATE. This KEY SHARE
   * lock conflicts with that reconstruction lock so the lineage
   * leaf decision is not made independently of a concurrent H2
   * reconstruction.
   */

  select
    assembly.assembly_state
  into
    v_assembly_state
  from
    public.hspp_evidence_assemblies
      as assembly
  where
    assembly.organization_id =
      v_checkpoint.organization_id

    and

    assembly.id =
      v_checkpoint.assembly_id
  for key share;


  if not found then
    raise exception
      'Q14ab historical assembly does not exist.';
  end if;


  if v_assembly_state <> 'SEALED' then
    raise exception
      'Q14ab effective-membership cessation requires the exact historical SEALED assembly.';
  end if;


  /*
   * Q14k guarantees at most one direct successor.
   *
   * A new cessation is authorized only while this exact assembly
   * remains the current lineage leaf. Once H2 exists, any later
   * post-positive cessation must target the appropriate descendant
   * membership rather than rewriting H1 lifecycle state.
   */

  if exists (
    select 1
    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
    where
      reconstruction.organization_id =
        v_checkpoint.organization_id

      and

      reconstruction.parent_assembly_id =
        v_checkpoint.assembly_id
  ) then
    raise exception
      'Q14ab cannot create a new cessation for an assembly that already has a reconstruction successor.';
  end if;


  select
    membership.*
  into
    v_membership
  from
    public.hspp_evidence_assembly_members
      as membership
  where
    membership.organization_id =
      v_checkpoint.organization_id

    and

    membership.assembly_id =
      v_checkpoint.assembly_id

    and

    membership.evidence_id =
      v_checkpoint.evidence_id

    and

    membership.evidence_integrity_fingerprint =
      v_checkpoint.integrity_fingerprint
  for key share;


  if not found then
    raise exception
      'Q14ab cannot resolve the exact immutable historical membership authorized by Q14v.';
  end if;


  /*
   * Callers may omit every derived provenance field.
   *
   * If any future privileged writer supplies one explicitly, a
   * mismatch fails closed rather than silently rewriting identity.
   */

  if
    new.organization_id is not null

    and

    new.organization_id <>
      v_checkpoint.organization_id
  then
    raise exception
      'Q14ab organization identity conflicts with Q14v.';
  end if;


  if
    new.assembly_id is not null

    and

    new.assembly_id <>
      v_checkpoint.assembly_id
  then
    raise exception
      'Q14ab assembly identity conflicts with Q14v.';
  end if;


  if
    new.evidence_id is not null

    and

    new.evidence_id <>
      v_checkpoint.evidence_id
  then
    raise exception
      'Q14ab evidence identity conflicts with Q14v.';
  end if;


  if
    new.integrity_fingerprint is not null

    and

    new.integrity_fingerprint <>
      v_checkpoint.integrity_fingerprint
  then
    raise exception
      'Q14ab integrity fingerprint conflicts with Q14v.';
  end if;


  if
    new.historical_membership_id is not null

    and

    new.historical_membership_id <>
      v_membership.id
  then
    raise exception
      'Q14ab historical membership identity conflicts with the exact Q14v member.';
  end if;


  if
    new.ceased_at is not null

    and

    new.ceased_at <>
      v_checkpoint.decided_at
  then
    raise exception
      'Q14ab ceased_at must equal the exact Q14v decided_at authority time.';
  end if;


  if
    new.cessation_version is distinct from
      'hspp-assembly-member-effective-cessation-v1'

    or

    new.cessation_policy_version is distinct from
      'hspp-post-positive-effective-membership-cessation-v1'

    or

    new.cessation_reason is distinct from
      'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP'
  then
    raise exception
      'Q14ab cessation version, policy and reason are database-owned constants.';
  end if;


  /*
   * Database-owned derivation.
   *
   * No caller invents membership identity or cessation time.
   */

  new.organization_id :=
    v_checkpoint.organization_id;

  new.assembly_id :=
    v_checkpoint.assembly_id;

  new.evidence_id :=
    v_checkpoint.evidence_id;

  new.integrity_fingerprint :=
    v_checkpoint.integrity_fingerprint;

  new.historical_membership_id :=
    v_membership.id;

  new.ceased_at :=
    v_checkpoint.decided_at;


  return new;
end;
$function$;


create trigger
  enforce_hspp_assembly_member_effective_cessation_insert
before insert
on
  public.hspp_assembly_member_effective_cessations
for each row
execute function
  public.enforce_hspp_assembly_member_effective_cessation_insert();


create or replace function
  public.prevent_hspp_assembly_member_effective_cessation_changes()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  raise exception
    'HSPP assembly-member effective cessations are append-only and immutable.';
end;
$function$;


create trigger
  prevent_hspp_assembly_member_effective_cessation_update
before update
on
  public.hspp_assembly_member_effective_cessations
for each row
execute function
  public.prevent_hspp_assembly_member_effective_cessation_changes();


create trigger
  prevent_hspp_assembly_member_effective_cessation_delete
before delete
on
  public.hspp_assembly_member_effective_cessations
for each row
execute function
  public.prevent_hspp_assembly_member_effective_cessation_changes();


alter table
  public.hspp_assembly_member_effective_cessations
enable row level security;


revoke all
on table
  public.hspp_assembly_member_effective_cessations
from public;


revoke all
on table
  public.hspp_assembly_member_effective_cessations
from anon;


revoke all
on table
  public.hspp_assembly_member_effective_cessations
from authenticated;


revoke all
on table
  public.hspp_assembly_member_effective_cessations
from service_role;


grant select
on table
  public.hspp_assembly_member_effective_cessations
to service_role;


revoke all
on function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
from public;


revoke all
on function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
from anon;


revoke all
on function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
from authenticated;


revoke all
on function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
from service_role;


revoke all
on function
  public.prevent_hspp_assembly_member_effective_cessation_changes()
from public;


revoke all
on function
  public.prevent_hspp_assembly_member_effective_cessation_changes()
from anon;


revoke all
on function
  public.prevent_hspp_assembly_member_effective_cessation_changes()
from authenticated;


revoke all
on function
  public.prevent_hspp_assembly_member_effective_cessation_changes()
from service_role;


comment on table
  public.hspp_assembly_member_effective_cessations
is
  'B7490-14AB1 append-only effective-membership cessation authority. One row means one exact immutable historical HSPP membership ceased being currently effective at the exact Q14v decision time. Historical H1 membership remains immutable. Row existence does not itself return evidence to Reservoir, select replacement evidence, create H2, persist reconstruction provenance, run validation or grant downstream authority.';


comment on column
  public.hspp_assembly_member_effective_cessations.historical_membership_id
is
  'Exact immutable hspp_evidence_assembly_members row whose CURRENTLY EFFECTIVE lifecycle membership has ceased. The historical row itself remains unchanged.';


comment on column
  public.hspp_assembly_member_effective_cessations.unsuitability_checkpoint_id
is
  'Exact Q14v post-positive unsuitability checkpoint authorizing this separate effective-membership cessation fact.';


comment on column
  public.hspp_assembly_member_effective_cessations.ceased_at
is
  'Database-derived from the exact Q14v decided_at timestamp. Callers do not invent a second lifecycle decision time.';


comment on column
  public.hspp_assembly_member_effective_cessations.cessation_reason
is
  'Deterministic v1 lifecycle reason only. This authority establishes cessation of current effective membership but does not itself return evidence to Reservoir or authorize descendant reconstruction.';


commit;