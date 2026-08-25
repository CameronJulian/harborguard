-- ============================================================
-- B7490-14V2
-- Exact immutable revalidation-basis provenance for Q14v.
--
-- Purpose:
-- Preserve the exact later HSPP evidence identity that may provide
-- the post-positive basis for classifying historical member C as
-- unsuitable for a descendant composition.
--
-- Existing Q14v rows remain valid with no revalidation basis.
-- A future basis-aware writer will populate both basis columns
-- atomically when R1 is the authoritative post-positive proof.
--
-- This migration deliberately does NOT:
-- - create R1 evidence;
-- - alter historical C evidence;
-- - alter historical H1 membership;
-- - alter or revoke Q14p positive provenance;
-- - change the existing Q14x writer;
-- - create effective cessation;
-- - return evidence to Reservoir;
-- - select C2;
-- - create H2;
-- - run reconstruction or whole-composite validation.
-- ============================================================

begin;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add column if not exists
  revalidation_evidence_id uuid null;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add column if not exists
  revalidation_integrity_fingerprint text null;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_revalidation_basis_complete;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add constraint
  hspp_member_unsuitability_revalidation_basis_complete
check (
  num_nonnulls(
    revalidation_evidence_id,
    revalidation_integrity_fingerprint
  ) in (0, 2)
);


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_revalidation_fingerprint_sha256;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add constraint
  hspp_member_unsuitability_revalidation_fingerprint_sha256
check (
  revalidation_integrity_fingerprint is null
  or
  revalidation_integrity_fingerprint ~ '^[a-f0-9]{64}$'
);


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_revalidation_distinct_from_target;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add constraint
  hspp_member_unsuitability_revalidation_distinct_from_target
check (
  revalidation_evidence_id is null
  or
  revalidation_evidence_id <> evidence_id
);


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_revalidation_evidence_fk;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add constraint
  hspp_member_unsuitability_revalidation_evidence_fk
foreign key (
  organization_id,
  revalidation_evidence_id,
  revalidation_integrity_fingerprint
)
references
  public.hspp_evidence (
    organization_id,
    id,
    integrity_fingerprint
  )
on delete restrict;


-- ============================================================
-- Q14v version/basis compatibility.
--
-- Legacy V1 remains valid only without R1 provenance.
--
-- R1-based unsuitability is a new durable checkpoint contract
-- and a new decision policy:
--
--   checkpoint-v2 + policy-v2 + exact R1 provenance.
--
-- Mixed V1/V2 combinations fail closed.
-- ============================================================

alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_checkpoint_version_exact;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_policy_version_exact;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
drop constraint if exists
  hspp_member_unsuitability_version_basis_exact;


alter table
  public.hspp_assembly_member_unsuitability_checkpoints
add constraint
  hspp_member_unsuitability_version_basis_exact
check (
  (
    checkpoint_version =
      'hspp-assembly-member-unsuitability-checkpoint-v1'
    and
    unsuitability_policy_version =
      'hspp-post-positive-member-unsuitability-v1'
    and
    revalidation_evidence_id is null
    and
    revalidation_integrity_fingerprint is null
  )
  or
  (
    checkpoint_version =
      'hspp-assembly-member-unsuitability-checkpoint-v2'
    and
    unsuitability_policy_version =
      'hspp-post-positive-member-unsuitability-v2'
    and
    revalidation_evidence_id is not null
    and
    revalidation_integrity_fingerprint is not null
  )
);


comment on constraint
  hspp_member_unsuitability_version_basis_exact
on
  public.hspp_assembly_member_unsuitability_checkpoints
is
  'Exact Q14v compatibility boundary: legacy checkpoint-v1/policy-v1 rows have no R1 basis; R1 checkpoint-v2/policy-v2 rows require complete exact immutable revalidation evidence provenance. Mixed versions or mixed basis states fail closed.';


create index if not exists
  hspp_member_unsuitability_revalidation_evidence_idx
on
  public.hspp_assembly_member_unsuitability_checkpoints (
    organization_id,
    revalidation_evidence_id
  )
where
  revalidation_evidence_id is not null;


comment on column
  public.hspp_assembly_member_unsuitability_checkpoints.revalidation_evidence_id
is
  'Optional exact immutable HSPP evidence identity for the later post-positive revalidation evidence that supplied the basis for this Q14v unsuitability fact. NULL preserves pre-extension Q14v provenance and does not itself authorize cessation or reconstruction.';


comment on column
  public.hspp_assembly_member_unsuitability_checkpoints.revalidation_integrity_fingerprint
is
  'Exact lowercase SHA-256 integrity identity of the optional later post-positive revalidation evidence. When present it is tenant-bound with revalidation_evidence_id to public.hspp_evidence and remains immutable with the Q14v row.';


commit;
