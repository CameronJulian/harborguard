begin;

-- B7490 post-positive lifecycle work discovery.
--
-- This bounded read authority discovers only completed positive HSPP
-- assembly members that still participate in the current effective
-- reconstruction-lineage leaf.
--
-- Two read-only states are exposed:
--
-- REEVALUATION_REQUIRED
--   No immutable Q14v member-unsuitability checkpoint exists yet.
--
-- CESSATION_REQUIRED
--   Q14v already exists but the exact historical membership has not
--   yet received Q14ab effective-membership cessation.
--
-- The second state is intentionally recoverable so a process crash
-- after Q14x but before Q14ac cannot strand the lifecycle.
--
-- This function does NOT:
--
-- - evaluate post-positive unsuitability;
-- - create or modify Q14v;
-- - create or modify Q14ab;
-- - acquire or renew an execution lease;
-- - modify evidence trust or assessment state;
-- - return evidence to the Reservoir;
-- - select replacement evidence;
-- - create or reconstruct H2;
-- - seal or assess a descendant;
-- - grant downstream authority.

create or replace function
  public.read_hspp_post_positive_lifecycle_work_items(
    p_organization_id uuid,
    p_limit integer
  )
returns table (
  positive_checkpoint_id uuid,
  organization_id uuid,
  assembly_id uuid,
  membership_id uuid,
  evidence_id uuid,
  integrity_fingerprint text,
  positive_assessed_at timestamptz,
  unsuitability_checkpoint_id uuid,
  unsuitability_observed_at timestamptz,
  unsuitability_decided_at timestamptz,
  work_state text
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin

  if p_organization_id is null then
    raise exception
      'Post-positive lifecycle work organization id is required.';
  end if;


  if (
    p_limit is null
    or p_limit < 1
    or p_limit > 100
  ) then
    raise exception
      'Post-positive lifecycle work limit must be between 1 and 100.';
  end if;


  return query

  select
    positive.id,
    positive.organization_id,
    positive.assembly_id,
    member.id,
    positive.evidence_id,
    positive.integrity_fingerprint,
    positive.assessed_at,
    unsuitability.id,
    unsuitability.observed_at,
    unsuitability.decided_at,
    case
      when unsuitability.id is null
        then 'REEVALUATION_REQUIRED'::text
      else
        'CESSATION_REQUIRED'::text
    end

  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive

  inner join
    public.hspp_evidence_assemblies
      as assembly
    on
      assembly.organization_id =
        positive.organization_id
      and assembly.id =
        positive.assembly_id
      and assembly.assembly_state =
        'SEALED'

  inner join
    public.hspp_evidence_assembly_members
      as member
    on
      member.organization_id =
        positive.organization_id
      and member.assembly_id =
        positive.assembly_id
      and member.evidence_id =
        positive.evidence_id
      and member.evidence_integrity_fingerprint =
        positive.integrity_fingerprint

  inner join
    public.hspp_assembly_assessment_completions
      as completion
    on
      completion.organization_id =
        positive.organization_id
      and completion.assembly_id =
        positive.assembly_id

  left join
    public.hspp_assembly_member_unsuitability_checkpoints
      as unsuitability
    on
      unsuitability.organization_id =
        positive.organization_id
      and unsuitability.assembly_id =
        positive.assembly_id
      and unsuitability.evidence_id =
        positive.evidence_id
      and unsuitability.prior_positive_checkpoint_id =
        positive.id

  where
    positive.organization_id =
      p_organization_id

    -- Current reconstruction-lineage leaf only.
    and not exists (

      select
        1

      from
        public.hspp_evidence_assembly_reconstructions
          as reconstruction

      where
        reconstruction.organization_id =
          positive.organization_id

        and reconstruction.parent_assembly_id =
          positive.assembly_id
    )

    -- Historical membership is still currently effective only while
    -- its exact immutable membership has no Q14ab cessation fact.
    and not exists (

      select
        1

      from
        public.hspp_assembly_member_effective_cessations
          as cessation

      where
        cessation.organization_id =
          positive.organization_id

        and cessation.historical_membership_id =
          member.id
    )

  order by
    positive.assessed_at asc,
    positive.id asc

  limit p_limit;

end;
$function$;


comment on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
is
  'Bounded service-role post-positive HSPP lifecycle work discovery. Returns only completed positive members on the current effective reconstruction leaf. REEVALUATION_REQUIRED means no Q14v checkpoint exists; CESSATION_REQUIRED means Q14v exists but Q14ab cessation has not yet been recorded. This authority is read-only and grants no unsuitability, cessation, Reservoir, replacement, reconstruction, validation or downstream authority.';


revoke all on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
from public;


revoke all on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
from anon;


revoke all on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
from authenticated;


revoke all on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
from service_role;


grant execute on function
  public.read_hspp_post_positive_lifecycle_work_items(
    uuid,
    integer
  )
to service_role;

commit;
