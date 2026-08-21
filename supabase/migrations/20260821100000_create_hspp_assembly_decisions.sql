-- ============================================================
-- HSPP-009B / B11E1
-- Immutable assembly-decision provenance ledger
-- ============================================================
--
-- This table records the exact protocol interpretation produced
-- for an HSPP evidence assembly.
--
-- It is deliberately separate from:
--
--   public.hspp_evidence
--   public.hspp_evidence_assemblies
--
-- A persisted assembly decision:
--
-- - does not mutate evidence trust_state;
-- - does not mutate validation_state;
-- - does not grant operational eligibility;
-- - does not grant Crowd eligibility;
-- - does not grant ML training eligibility;
-- - does not establish physical-world truth;
-- - does not itself establish CORROBORATED or VERIFIED trust.
--
-- Rows are append-only provenance records.
-- ============================================================

create table public.hspp_assembly_decisions (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  assembly_id uuid not null,

  assembly_scan_version text not null,

  assembly_decision_policy_version text not null,

  assembly_decision_state text not null,

  assembly_decision_reason text not null,

  member_count integer not null,

  pair_count integer not null,

  canonical_conflict_count integer not null,

  canonical_agreement_count integer not null,

  canonical_unknown_count integer not null,

  has_canonical_conflict boolean not null,

  scan_summary jsonb not null,

  decision_summary jsonb not null,

  authority text not null
    default 'NONE',

  decided_at timestamptz not null
    default now(),

  constraint hspp_assembly_decisions_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_assembly_decisions_scan_version_not_blank
    check (
      length(
        btrim(
          assembly_scan_version
        )
      ) > 0
    ),

  constraint hspp_assembly_decisions_policy_version_not_blank
    check (
      length(
        btrim(
          assembly_decision_policy_version
        )
      ) > 0
    ),

  constraint hspp_assembly_decisions_state_v1
    check (
      assembly_decision_state in (
        'NOT_READY',
        'CONFLICTED',
        'UNRESOLVED',
        'CONSISTENT'
      )
    ),

  constraint hspp_assembly_decisions_reason_v1
    check (
      assembly_decision_reason in (
        'ASSEMBLY_NOT_SCANNED',
        'INSUFFICIENT_EVIDENCE',
        'INVALID_SCAN_SUMMARY',
        'CANONICAL_CONFLICT_PRESENT',
        'NO_COMPARABLE_AGREEMENT',
        'CANONICAL_AGREEMENT_WITHOUT_CONFLICT'
      )
    ),

  constraint hspp_assembly_decisions_state_reason_consistent
    check (
      (
        assembly_decision_state =
          'NOT_READY'
        and
        assembly_decision_reason in (
          'ASSEMBLY_NOT_SCANNED',
          'INSUFFICIENT_EVIDENCE',
          'INVALID_SCAN_SUMMARY'
        )
      )
      or
      (
        assembly_decision_state =
          'CONFLICTED'
        and
        assembly_decision_reason =
          'CANONICAL_CONFLICT_PRESENT'
      )
      or
      (
        assembly_decision_state =
          'UNRESOLVED'
        and
        assembly_decision_reason =
          'NO_COMPARABLE_AGREEMENT'
      )
      or
      (
        assembly_decision_state =
          'CONSISTENT'
        and
        assembly_decision_reason =
          'CANONICAL_AGREEMENT_WITHOUT_CONFLICT'
      )
    ),

  constraint hspp_assembly_decisions_member_count_nonnegative
    check (
      member_count >= 0
    ),

  constraint hspp_assembly_decisions_pair_count_nonnegative
    check (
      pair_count >= 0
    ),

  constraint hspp_assembly_decisions_conflict_count_nonnegative
    check (
      canonical_conflict_count >= 0
    ),

  constraint hspp_assembly_decisions_agreement_count_nonnegative
    check (
      canonical_agreement_count >= 0
    ),

  constraint hspp_assembly_decisions_unknown_count_nonnegative
    check (
      canonical_unknown_count >= 0
    ),

  constraint hspp_assembly_decisions_conflict_flag_consistent
    check (
      (
        has_canonical_conflict = true
        and canonical_conflict_count > 0
      )
      or
      (
        has_canonical_conflict = false
        and canonical_conflict_count = 0
      )
    ),

  constraint hspp_assembly_decisions_conflicted_state_consistent
    check (
      assembly_decision_state <>
        'CONFLICTED'
      or
      canonical_conflict_count > 0
    ),

  constraint hspp_assembly_decisions_consistent_state_consistent
    check (
      assembly_decision_state <>
        'CONSISTENT'
      or
      (
        canonical_conflict_count = 0
        and canonical_agreement_count > 0
      )
    ),

  constraint hspp_assembly_decisions_unresolved_state_consistent
    check (
      assembly_decision_state <>
        'UNRESOLVED'
      or
      (
        canonical_conflict_count = 0
        and canonical_agreement_count = 0
      )
    ),

  constraint hspp_assembly_decisions_scan_summary_object
    check (
      jsonb_typeof(
        scan_summary
      ) = 'object'
    ),

  constraint hspp_assembly_decisions_decision_summary_object
    check (
      jsonb_typeof(
        decision_summary
      ) = 'object'
    ),

  constraint hspp_assembly_decisions_authority_none
    check (
      authority = 'NONE'
    )
);

create index
  hspp_assembly_decisions_assembly_lookup
on public.hspp_assembly_decisions (
  organization_id,
  assembly_id,
  decided_at
);

create index
  hspp_assembly_decisions_state_lookup
on public.hspp_assembly_decisions (
  organization_id,
  assembly_decision_state,
  decided_at
);

alter table
  public.hspp_assembly_decisions
enable row level security;

-- ============================================================
-- Append-only protection
-- ============================================================

create or replace function
  public.prevent_hspp_assembly_decision_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'HSPP assembly decisions are immutable and cannot be changed.';
end;
$$;

create trigger
  hspp_assembly_decisions_prevent_update
before update
on public.hspp_assembly_decisions
for each row
execute function
  public.prevent_hspp_assembly_decision_changes();

create trigger
  hspp_assembly_decisions_prevent_delete
before delete
on public.hspp_assembly_decisions
for each row
execute function
  public.prevent_hspp_assembly_decision_changes();

-- ============================================================
-- Protocol-boundary documentation
-- ============================================================

comment on table
  public.hspp_assembly_decisions
is
  'Append-only HSPP assembly-decision provenance. Each row preserves one versioned B11D protocol interpretation together with the exact B11C scan snapshot that produced it. Persistence does not establish physical-world truth, trust promotion, validation promotion, Route Safety authority, Crowd eligibility, ML eligibility, corroboration or verification.';

comment on column
  public.hspp_assembly_decisions.assembly_scan_version
is
  'Exact version of the B11C completed-assembly scanner whose immutable summary is preserved by this row.';

comment on column
  public.hspp_assembly_decisions.assembly_decision_policy_version
is
  'Exact version of the B11D master assembly-decision policy that produced this row.';

comment on column
  public.hspp_assembly_decisions.scan_summary
is
  'Exact B11C scan result supplied to the B11D interpretation boundary. Stored for provenance only and grants no authority.';

comment on column
  public.hspp_assembly_decisions.decision_summary
is
  'Exact B11D protocol decision persisted for historical provenance. CONSISTENT does not by itself mean CORROBORATED, VERIFIED or physically true.';

comment on column
  public.hspp_assembly_decisions.authority
is
  'B11E1 authority boundary. Must remain NONE. Persisting an assembly decision grants no operational, Crowd, ML, validation, trust or Route Safety authority.';