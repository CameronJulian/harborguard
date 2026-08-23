-- B7490-14K1
-- Single-successor HSPP reconstruction lineage invariant.
--
-- Invariant:
--
--   Within one organization, one immutable HSPP evidence assembly
--   may be the historical parent of at most one direct
--   reconstruction child.
--
-- Existing child uniqueness already guarantees that one child has
-- at most one reconstruction parent. This complementary parent
-- uniqueness makes the reconstruction lineage non-branching at
-- every direct transition:
--
--   H1 -> H2 -> H3
--
-- Historical assemblies and historical memberships remain immutable.
-- This migration does not:
--
-- - create or reconstruct an assembly;
-- - mutate parent or child assembly membership;
-- - return evidence to Reservoir;
-- - select replacement evidence;
-- - seal or assess a reconstructed child;
-- - alter evidence trust;
-- - grant downstream Route Safety, Crowd Intelligence or ML authority;
-- - create runtime, API, cron or scheduler behavior.
--
-- The database UNIQUE constraint is the authoritative concurrency
-- boundary. Concurrent attempts to create different direct children
-- for the same organization-scoped parent cannot both commit.

alter table
  public.hspp_evidence_assembly_reconstructions
add constraint
  hspp_reconstruction_parent_unique
unique (
  organization_id,
  parent_assembly_id
);

comment on constraint
  hspp_reconstruction_parent_unique
on
  public.hspp_evidence_assembly_reconstructions
is
  'B7490-14K1 single-successor reconstruction-lineage invariant. Within one organization an immutable HSPP assembly may be the historical parent of at most one direct reconstruction child. This prevents reconstruction branching without mutating historical assemblies, historical membership, evidence trust, Reservoir state or downstream authority.';
