-- ============================================================
-- B7490-14V1
-- Immutable post-positive assembly-member unsuitability substrate.
--
-- Purpose:
-- Preserve one append-only fact that an exact member of one
-- historical SEALED assembly, which previously received the
-- immutable positive Q14p/Q14r checkpoint, has subsequently been
-- classified as unsuitable for a descendant composition.
--
-- This migration deliberately does NOT:
-- - mutate historical assembly membership;
-- - mutate or revoke the prior positive checkpoint;
-- - mutate hspp_evidence trust or eligibility;
-- - create a descendant assembly;
-- - persist REMOVED / RETAINED / ADDED reconstruction provenance;
-- - return evidence to Reservoir;
-- - select replacement evidence;
-- - run whole-composite validation;
-- - grant Route Safety, Crowd Intelligence, ML training or
--   validation authority;
-- - create the runtime writer/evaluator for this fact.
-- ============================================================

begin;


create table
  public.hspp_assembly_member_unsuitability_checkpoints
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

  prior_positive_checkpoint_id uuid
    not null,

  checkpoint_version text
    not null
    default
      'hspp-assembly-member-unsuitability-checkpoint-v1',

  unsuitability_policy_version text
    not null
    default
      'hspp-post-positive-member-unsuitability-v1',

  unsuitability_reason text
    not null
    default
      'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION',

  observed_at timestamptz
    not null,

  decided_at timestamptz
    not null,

  created_at timestamptz
    not null
    default now(),


  constraint hspp_member_unsuitability_assembly_fk
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


  constraint hspp_member_unsuitability_evidence_fk
    foreign key (
      evidence_id
    )
    references
      public.hspp_evidence (
        id
      )
    on delete restrict,


  constraint hspp_member_unsuitability_positive_checkpoint_fk
    foreign key (
      prior_positive_checkpoint_id
    )
    references
      public.hspp_assembly_positive_assessment_checkpoints (
        id
      )
    on delete restrict,


  constraint hspp_member_unsuitability_prior_positive_unique
    unique (
      prior_positive_checkpoint_id
    ),


  constraint hspp_member_unsuitability_member_unique
    unique (
      organization_id,
      assembly_id,
      evidence_id
    ),


  constraint hspp_member_unsuitability_fingerprint_format
    check (
      integrity_fingerprint ~ '^[a-f0-9]{64}$'
    ),


  constraint hspp_member_unsuitability_checkpoint_version_exact
    check (
      checkpoint_version =
        'hspp-assembly-member-unsuitability-checkpoint-v1'
    ),


  constraint hspp_member_unsuitability_policy_version_exact
    check (
      unsuitability_policy_version =
        'hspp-post-positive-member-unsuitability-v1'
    ),


  constraint hspp_member_unsuitability_reason_exact
    check (
      unsuitability_reason =
        'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'
    ),


  constraint hspp_member_unsuitability_time_order
    check (
      decided_at >= observed_at
    )
);


create or replace function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_positive
    public.hspp_assembly_positive_assessment_checkpoints%rowtype;

  v_assembly_state text;

begin

  select
    positive.*
  into
    v_positive
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.id =
      new.prior_positive_checkpoint_id;


  if not found then
    raise exception
      'Prior positive HSPP assessment checkpoint does not exist.';
  end if;


  if
    v_positive.organization_id <>
      new.organization_id

    or
    v_positive.assembly_id <>
      new.assembly_id

    or
    v_positive.evidence_id <>
      new.evidence_id

    or
    v_positive.integrity_fingerprint <>
      new.integrity_fingerprint
  then
    raise exception
      'Post-positive member unsuitability identity does not match the exact prior positive checkpoint.';
  end if;


  if
    new.observed_at <
      v_positive.assessed_at
  then
    raise exception
      'Post-positive member unsuitability observation must not precede the prior positive assessment.';
  end if;


  select
    assembly.assembly_state
  into
    v_assembly_state
  from
    public.hspp_evidence_assemblies
      as assembly
  where
    assembly.organization_id =
      new.organization_id

    and
    assembly.id =
      new.assembly_id;


  if
    v_assembly_state is null
    or
    v_assembly_state <>
      'SEALED'
  then
    raise exception
      'Post-positive member unsuitability requires one historical SEALED assembly.';
  end if;


  if not exists (
    select
      1
    from
      public.hspp_evidence_assembly_members
        as member
    where
      member.organization_id =
        new.organization_id

      and
      member.assembly_id =
        new.assembly_id

      and
      member.evidence_id =
        new.evidence_id

      and
      member.evidence_integrity_fingerprint =
        new.integrity_fingerprint
  ) then
    raise exception
      'Post-positive member unsuitability target does not match exact historical assembly membership.';
  end if;


  return new;

end;
$function$;


create or replace function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes()
returns trigger
language plpgsql
set search_path = public
as $function$
begin

  raise exception
    'HSPP assembly-member unsuitability checkpoints are append-only and immutable.';

end;
$function$;


create trigger
  hspp_member_unsuitability_validate_insert
before insert
on
  public.hspp_assembly_member_unsuitability_checkpoints
for each row
execute function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert();


create trigger
  hspp_member_unsuitability_prevent_update
before update
on
  public.hspp_assembly_member_unsuitability_checkpoints
for each row
execute function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes();


create trigger
  hspp_member_unsuitability_prevent_delete
before delete
on
  public.hspp_assembly_member_unsuitability_checkpoints
for each row
execute function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes();


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
enable row level security;


revoke all
on table
  public.hspp_assembly_member_unsuitability_checkpoints
from public;


revoke all
on table
  public.hspp_assembly_member_unsuitability_checkpoints
from anon;


revoke all
on table
  public.hspp_assembly_member_unsuitability_checkpoints
from authenticated;


revoke all
on table
  public.hspp_assembly_member_unsuitability_checkpoints
from service_role;


grant select
on table
  public.hspp_assembly_member_unsuitability_checkpoints
to service_role;


revoke all
on function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert()
from public;


revoke all
on function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert()
from anon;


revoke all
on function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert()
from authenticated;


revoke all
on function
  public.enforce_hspp_assembly_member_unsuitability_checkpoint_insert()
from service_role;


revoke all
on function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes()
from public;


revoke all
on function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes()
from anon;


revoke all
on function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes()
from authenticated;


revoke all
on function
  public.prevent_hspp_assembly_member_unsuitability_checkpoint_changes()
from service_role;


comment on table
  public.hspp_assembly_member_unsuitability_checkpoints
is
  'B7490-14V1 append-only post-positive member-unsuitability provenance. Each row binds one exact historical SEALED assembly member and immutable integrity fingerprint to its prior Q14p positive assessment checkpoint and records only that the member was subsequently classified as unsuitable for a descendant composition. Row existence does not mutate H1, revoke historical Q14p provenance, create H2, establish effective membership, return evidence to Reservoir, select replacement evidence, run reconstruction or validation, or grant downstream authority.';


comment on column
  public.hspp_assembly_member_unsuitability_checkpoints.prior_positive_checkpoint_id
is
  'Exact immutable Q14p/Q14r positive checkpoint whose organization, assembly, evidence identity and fingerprint must match this post-positive unsuitability fact.';


comment on column
  public.hspp_assembly_member_unsuitability_checkpoints.unsuitability_reason
is
  'Deterministic v1 provenance reason only. This reason does not itself detach evidence, revoke historical positive provenance, return evidence to Reservoir or authorize reconstruction.';


commit;