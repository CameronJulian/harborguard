-- ============================================================================
-- B7490-Q14AG31A
-- Durable HSPP reconstruction execution-intent claim authority.
--
-- Purpose
-- -------
-- Freeze the exact already-authorized Reservoir reconstruction decision before
-- any Q14h descendant mutation can occur.
--
-- The intent is NOT reconstruction execution.
--
-- It preserves:
--
-- - one canonical caller-owned child assembly UUID;
-- - the original deterministic B07A pair orientation;
-- - exact HISTORICAL_NOT_CURRENT evidence identity/fingerprint;
-- - exact NEVER_ASSEMBLED replacement identity/fingerprint;
-- - the B07B discovery/reevaluation policy versions;
-- - the membership policy that authorized the selected pair;
-- - the trusted reconstruction policy/reason.
--
-- Claim/recover semantics
-- -----------------------
-- The caller supplies a PROPOSED child UUID.
--
-- A first claim stores that UUID as the canonical Q14h retry identity.
--
-- A later exact authorization claim may supply a different newly-generated
-- proposed UUID. The authority returns the already-persisted canonical child
-- UUID instead of creating another intent.
--
-- This makes the child retry identity durable before mutation.
--
-- This authority deliberately does NOT:
--
-- - discover Reservoir evidence;
-- - evaluate B07A/B11A2 membership;
-- - decide reconstruction eligibility;
-- - read Q14ag14 actionable history;
-- - execute Q14h;
-- - create H2;
-- - seal or assess H2;
-- - mutate evidence trust;
-- - return evidence to Reservoir;
-- - grant downstream authority;
-- - create API/cron/queue/scheduler behavior.
-- ============================================================================

begin;


create table
  if not exists public.hspp_reconstruction_execution_intents (
    id uuid
      primary key
      default gen_random_uuid(),

    organization_id uuid
      not null,

    child_assembly_id uuid
      not null,

    selected_first_evidence_id uuid
      not null
      references public.hspp_evidence(id)
      on delete restrict,

    selected_second_evidence_id uuid
      not null
      references public.hspp_evidence(id)
      on delete restrict,

    historical_evidence_id uuid
      not null
      references public.hspp_evidence(id)
      on delete restrict,

    historical_evidence_integrity_fingerprint text
      not null,

    replacement_evidence_id uuid
      not null
      references public.hspp_evidence(id)
      on delete restrict,

    replacement_evidence_integrity_fingerprint text
      not null,

    discovery_policy_version text
      not null,

    reevaluation_policy_version text
      not null,

    membership_policy_version text
      not null,

    reconstruction_policy_version text
      not null,

    reconstruction_reason text
      not null,

    intent_version text
      not null
      default 'hspp-reconstruction-execution-intent-v1',

    created_at timestamptz
      not null
      default now(),

    constraint hspp_recon_intent_child_unique
      unique (child_assembly_id),

    constraint hspp_recon_intent_pair_distinct
      check (
        selected_first_evidence_id <>
          selected_second_evidence_id
      ),

    constraint hspp_recon_intent_roles_distinct
      check (
        historical_evidence_id <>
          replacement_evidence_id
      ),

    constraint hspp_recon_intent_pair_roles_exact
      check (
        (
          selected_first_evidence_id =
            historical_evidence_id
          and
          selected_second_evidence_id =
            replacement_evidence_id
        )
        or
        (
          selected_first_evidence_id =
            replacement_evidence_id
          and
          selected_second_evidence_id =
            historical_evidence_id
        )
      ),

    constraint hspp_recon_intent_historical_sha256
      check (
        historical_evidence_integrity_fingerprint
          ~ '^[0-9a-f]{64}$'
      ),

    constraint hspp_recon_intent_replacement_sha256
      check (
        replacement_evidence_integrity_fingerprint
          ~ '^[0-9a-f]{64}$'
      ),

    constraint hspp_recon_intent_discovery_policy_length
      check (
        length(trim(discovery_policy_version))
          between 1 and 128
      ),

    constraint hspp_recon_intent_reevaluation_policy_length
      check (
        length(trim(reevaluation_policy_version))
          between 1 and 128
      ),

    constraint hspp_recon_intent_membership_policy_length
      check (
        length(trim(membership_policy_version))
          between 1 and 128
      ),

    constraint hspp_recon_intent_reconstruction_policy_length
      check (
        length(trim(reconstruction_policy_version))
          between 1 and 128
      ),

    constraint hspp_recon_intent_reason_length
      check (
        length(trim(reconstruction_reason))
          between 1 and 512
      ),

    constraint hspp_recon_intent_version_exact
      check (
        intent_version =
          'hspp-reconstruction-execution-intent-v1'
      ),

    constraint hspp_recon_intent_decision_unique
      unique (
        organization_id,
        selected_first_evidence_id,
        selected_second_evidence_id,
        historical_evidence_id,
        historical_evidence_integrity_fingerprint,
        replacement_evidence_id,
        replacement_evidence_integrity_fingerprint,
        discovery_policy_version,
        reevaluation_policy_version,
        membership_policy_version,
        reconstruction_policy_version,
        reconstruction_reason
      )
  );


comment on table
  public.hspp_reconstruction_execution_intents
is
  'B7490-Q14AG31A immutable pre-execution reconstruction intent. Freezes one already-authorized Reservoir H1->H2 reconstruction decision and its canonical caller-owned child UUID before Q14h mutation. The row itself grants no reconstruction, sealing, assessment, trust, Reservoir, scheduling or downstream authority.';


alter table
  public.hspp_reconstruction_execution_intents
enable row level security;


revoke all
on table
  public.hspp_reconstruction_execution_intents
from public;


revoke all
on table
  public.hspp_reconstruction_execution_intents
from anon;


revoke all
on table
  public.hspp_reconstruction_execution_intents
from authenticated;


revoke all
on table
  public.hspp_reconstruction_execution_intents
from service_role;


create or replace function
  public.guard_hspp_reconstruction_execution_intent_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'HSPP reconstruction execution intents are immutable.';
end;
$$;


drop trigger
  if exists hspp_reconstruction_execution_intent_immutable
on public.hspp_reconstruction_execution_intents;


create trigger
  hspp_reconstruction_execution_intent_immutable
before update or delete
on public.hspp_reconstruction_execution_intents
for each row
execute function
  public.guard_hspp_reconstruction_execution_intent_immutable();


create or replace function
  public.claim_hspp_reconstruction_execution_intent(
    p_organization_id uuid,
    p_proposed_child_assembly_id uuid,
    p_selected_first_evidence_id uuid,
    p_selected_second_evidence_id uuid,
    p_historical_evidence_id uuid,
    p_historical_evidence_integrity_fingerprint text,
    p_replacement_evidence_id uuid,
    p_replacement_evidence_integrity_fingerprint text,
    p_discovery_policy_version text,
    p_reevaluation_policy_version text,
    p_membership_policy_version text,
    p_reconstruction_policy_version text,
    p_reconstruction_reason text
  )
returns table (
  intent_id uuid,
  organization_id uuid,
  child_assembly_id uuid,
  selected_first_evidence_id uuid,
  selected_second_evidence_id uuid,
  historical_evidence_id uuid,
  historical_evidence_integrity_fingerprint text,
  replacement_evidence_id uuid,
  replacement_evidence_integrity_fingerprint text,
  discovery_policy_version text,
  reevaluation_policy_version text,
  membership_policy_version text,
  reconstruction_policy_version text,
  reconstruction_reason text,
  intent_version text,
  created_at timestamptz,
  idempotent_recovery boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing
    public.hspp_reconstruction_execution_intents%rowtype;

  v_inserted
    public.hspp_reconstruction_execution_intents%rowtype;

  v_matching_evidence_count integer;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;


  if p_proposed_child_assembly_id is null then
    raise exception
      'p_proposed_child_assembly_id is required';
  end if;


  if
    p_selected_first_evidence_id is null
    or p_selected_second_evidence_id is null
    or p_historical_evidence_id is null
    or p_replacement_evidence_id is null
  then
    raise exception
      'All reconstruction intent evidence identities are required';
  end if;


  if
    p_selected_first_evidence_id =
      p_selected_second_evidence_id
  then
    raise exception
      'Reconstruction intent selected evidence identities must be distinct';
  end if;


  if
    p_historical_evidence_id =
      p_replacement_evidence_id
  then
    raise exception
      'Reconstruction historical and replacement evidence identities must be distinct';
  end if;


  if not (
    (
      p_selected_first_evidence_id =
        p_historical_evidence_id
      and
      p_selected_second_evidence_id =
        p_replacement_evidence_id
    )
    or
    (
      p_selected_first_evidence_id =
        p_replacement_evidence_id
      and
      p_selected_second_evidence_id =
        p_historical_evidence_id
    )
  ) then
    raise exception
      'Reconstruction intent pair orientation does not exactly contain the historical and replacement evidence identities';
  end if;


  if
    p_historical_evidence_integrity_fingerprint is null
    or
    p_historical_evidence_integrity_fingerprint
      !~ '^[0-9a-f]{64}$'
  then
    raise exception
      'p_historical_evidence_integrity_fingerprint must be lowercase SHA-256';
  end if;


  if
    p_replacement_evidence_integrity_fingerprint is null
    or
    p_replacement_evidence_integrity_fingerprint
      !~ '^[0-9a-f]{64}$'
  then
    raise exception
      'p_replacement_evidence_integrity_fingerprint must be lowercase SHA-256';
  end if;


  if
    p_discovery_policy_version is null
    or length(trim(p_discovery_policy_version))
      not between 1 and 128
  then
    raise exception
      'p_discovery_policy_version is required';
  end if;


  if
    p_reevaluation_policy_version is null
    or length(trim(p_reevaluation_policy_version))
      not between 1 and 128
  then
    raise exception
      'p_reevaluation_policy_version is required';
  end if;


  if
    p_membership_policy_version is null
    or length(trim(p_membership_policy_version))
      not between 1 and 128
  then
    raise exception
      'p_membership_policy_version is required';
  end if;


  if
    p_reconstruction_policy_version is null
    or length(trim(p_reconstruction_policy_version))
      not between 1 and 128
  then
    raise exception
      'p_reconstruction_policy_version is required';
  end if;


  if
    p_reconstruction_reason is null
    or length(trim(p_reconstruction_reason))
      not between 1 and 512
  then
    raise exception
      'p_reconstruction_reason is required';
  end if;


  /*
   * First recover by the immutable DECISION identity, not by the
   * newly-proposed child UUID.
   *
   * This is the critical crash/retry behavior:
   *
   * a later process may generate a fresh proposed UUID but must recover
   * the original canonical child UUID if this exact decision was already
   * durably claimed.
   */
  select
    intent.*
  into
    v_existing
  from
    public.hspp_reconstruction_execution_intents
      as intent
  where
    intent.organization_id =
      p_organization_id

    and intent.selected_first_evidence_id =
      p_selected_first_evidence_id

    and intent.selected_second_evidence_id =
      p_selected_second_evidence_id

    and intent.historical_evidence_id =
      p_historical_evidence_id

    and intent.historical_evidence_integrity_fingerprint =
      p_historical_evidence_integrity_fingerprint

    and intent.replacement_evidence_id =
      p_replacement_evidence_id

    and intent.replacement_evidence_integrity_fingerprint =
      p_replacement_evidence_integrity_fingerprint

    and intent.discovery_policy_version =
      trim(p_discovery_policy_version)

    and intent.reevaluation_policy_version =
      trim(p_reevaluation_policy_version)

    and intent.membership_policy_version =
      trim(p_membership_policy_version)

    and intent.reconstruction_policy_version =
      trim(p_reconstruction_policy_version)

    and intent.reconstruction_reason =
      trim(p_reconstruction_reason)
  for update;


  if found then
    return query
    select
      v_existing.id,
      v_existing.organization_id,
      v_existing.child_assembly_id,
      v_existing.selected_first_evidence_id,
      v_existing.selected_second_evidence_id,
      v_existing.historical_evidence_id,
      v_existing.historical_evidence_integrity_fingerprint,
      v_existing.replacement_evidence_id,
      v_existing.replacement_evidence_integrity_fingerprint,
      v_existing.discovery_policy_version,
      v_existing.reevaluation_policy_version,
      v_existing.membership_policy_version,
      v_existing.reconstruction_policy_version,
      v_existing.reconstruction_reason,
      v_existing.intent_version,
      v_existing.created_at,
      true;

    return;
  end if;


  /*
   * The claim must refer to the exact persisted evidence fingerprints
   * that existed in the already-computed B07B snapshot.
   */
  select
    count(*)::integer
  into
    v_matching_evidence_count
  from
    public.hspp_evidence
      as evidence
  where
    evidence.organization_id =
      p_organization_id

    and (
      (
        evidence.id =
          p_historical_evidence_id

        and evidence.integrity_fingerprint =
          p_historical_evidence_integrity_fingerprint
      )
      or
      (
        evidence.id =
          p_replacement_evidence_id

        and evidence.integrity_fingerprint =
          p_replacement_evidence_integrity_fingerprint
      )
    );


  if v_matching_evidence_count <> 2 then
    raise exception
      'Reconstruction execution intent evidence identity/fingerprint does not exactly match persisted organization evidence';
  end if;


  /*
   * A NEW intent cannot adopt a UUID that already belongs to an assembly.
   *
   * An exact intent retry whose child later became H2 was already returned
   * above before this check.
   */
  if exists (
    select
      1
    from
      public.hspp_evidence_assemblies
        as assembly
    where
      assembly.id =
        p_proposed_child_assembly_id
  ) then
    raise exception
      'Proposed reconstruction child UUID is already owned by an HSPP assembly';
  end if;


  if exists (
    select
      1
    from
      public.hspp_reconstruction_execution_intents
        as other_intent
    where
      other_intent.child_assembly_id =
        p_proposed_child_assembly_id
  ) then
    raise exception
      'Proposed reconstruction child UUID is already owned by another reconstruction intent';
  end if;


  insert into
    public.hspp_reconstruction_execution_intents (
      organization_id,
      child_assembly_id,
      selected_first_evidence_id,
      selected_second_evidence_id,
      historical_evidence_id,
      historical_evidence_integrity_fingerprint,
      replacement_evidence_id,
      replacement_evidence_integrity_fingerprint,
      discovery_policy_version,
      reevaluation_policy_version,
      membership_policy_version,
      reconstruction_policy_version,
      reconstruction_reason
    )
  values (
    p_organization_id,
    p_proposed_child_assembly_id,
    p_selected_first_evidence_id,
    p_selected_second_evidence_id,
    p_historical_evidence_id,
    p_historical_evidence_integrity_fingerprint,
    p_replacement_evidence_id,
    p_replacement_evidence_integrity_fingerprint,
    trim(p_discovery_policy_version),
    trim(p_reevaluation_policy_version),
    trim(p_membership_policy_version),
    trim(p_reconstruction_policy_version),
    trim(p_reconstruction_reason)
  )
  on conflict do nothing
  returning *
  into
    v_inserted;


  if not found then
    /*
     * Resolve a concurrent exact decision claim.
     *
     * The winner's child UUID becomes canonical even when this caller
     * proposed a different UUID.
     */
    select
      intent.*
    into
      v_existing
    from
      public.hspp_reconstruction_execution_intents
        as intent
    where
      intent.organization_id =
        p_organization_id

      and intent.selected_first_evidence_id =
        p_selected_first_evidence_id

      and intent.selected_second_evidence_id =
        p_selected_second_evidence_id

      and intent.historical_evidence_id =
        p_historical_evidence_id

      and intent.historical_evidence_integrity_fingerprint =
        p_historical_evidence_integrity_fingerprint

      and intent.replacement_evidence_id =
        p_replacement_evidence_id

      and intent.replacement_evidence_integrity_fingerprint =
        p_replacement_evidence_integrity_fingerprint

      and intent.discovery_policy_version =
        trim(p_discovery_policy_version)

      and intent.reevaluation_policy_version =
        trim(p_reevaluation_policy_version)

      and intent.membership_policy_version =
        trim(p_membership_policy_version)

      and intent.reconstruction_policy_version =
        trim(p_reconstruction_policy_version)

      and intent.reconstruction_reason =
        trim(p_reconstruction_reason)
    for update;


    if found then
      return query
      select
        v_existing.id,
        v_existing.organization_id,
        v_existing.child_assembly_id,
        v_existing.selected_first_evidence_id,
        v_existing.selected_second_evidence_id,
        v_existing.historical_evidence_id,
        v_existing.historical_evidence_integrity_fingerprint,
        v_existing.replacement_evidence_id,
        v_existing.replacement_evidence_integrity_fingerprint,
        v_existing.discovery_policy_version,
        v_existing.reevaluation_policy_version,
        v_existing.membership_policy_version,
        v_existing.reconstruction_policy_version,
        v_existing.reconstruction_reason,
        v_existing.intent_version,
        v_existing.created_at,
        true;

      return;
    end if;


    raise exception
      'Reconstruction execution intent claim conflicts with an existing durable identity';
  end if;


  /*
   * Fail closed if another subsystem raced and claimed the proposed child
   * assembly UUID while this transaction was establishing a new intent.
   */
  if exists (
    select
      1
    from
      public.hspp_evidence_assemblies
        as assembly
    where
      assembly.id =
        v_inserted.child_assembly_id
  ) then
    raise exception
      'New reconstruction intent child UUID became owned by an HSPP assembly before intent claim completed';
  end if;


  return query
  select
    v_inserted.id,
    v_inserted.organization_id,
    v_inserted.child_assembly_id,
    v_inserted.selected_first_evidence_id,
    v_inserted.selected_second_evidence_id,
    v_inserted.historical_evidence_id,
    v_inserted.historical_evidence_integrity_fingerprint,
    v_inserted.replacement_evidence_id,
    v_inserted.replacement_evidence_integrity_fingerprint,
    v_inserted.discovery_policy_version,
    v_inserted.reevaluation_policy_version,
    v_inserted.membership_policy_version,
    v_inserted.reconstruction_policy_version,
    v_inserted.reconstruction_reason,
    v_inserted.intent_version,
    v_inserted.created_at,
    false;
end;
$$;


comment on function
  public.claim_hspp_reconstruction_execution_intent(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
is
  'B7490-Q14AG31A service-role-only atomic claim-or-recover authority for immutable pre-Q14h reconstruction execution intent. A first exact B07B reconstruction decision claims one caller-proposed child UUID as canonical retry identity. A later identical decision recovers the already-claimed canonical child even if that caller proposes a different fresh UUID. Evidence identities/fingerprints and all policy/reason provenance are preserved. This function does not execute reconstruction, create H2, seal, assess, mutate trust/Reservoir state, schedule work or grant downstream authority.';


revoke all
on function
  public.claim_hspp_reconstruction_execution_intent(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
from public;


revoke all
on function
  public.claim_hspp_reconstruction_execution_intent(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
from anon;


revoke all
on function
  public.claim_hspp_reconstruction_execution_intent(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
from authenticated;


grant execute
on function
  public.claim_hspp_reconstruction_execution_intent(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
to service_role;


notify pgrst, 'reload schema';


commit;
