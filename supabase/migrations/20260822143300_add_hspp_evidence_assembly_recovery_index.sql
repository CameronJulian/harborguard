-- B7490-07Q13a
--
-- Persisted HSPP assembly recovery/discovery requires a bounded,
-- organization-scoped and lifecycle-state-scoped read path.
--
-- The protocol already persists:
--
--   organization_id
--   assembly_state
--   created_at
--   id
--
-- but no committed index currently orders those fields together for
-- deterministic recovery discovery.
--
-- This migration adds only that read-performance prerequisite.
--
-- It does NOT:
--
-- - discover or execute recovery work;
-- - decide whether a SEALED assembly is pending or completed;
-- - create or mutate an assembly;
-- - seal an assembly;
-- - alter immutable assembly membership;
-- - generate or persist Q12 assessedAt;
-- - alter evidence trust;
-- - grant operational, Crowd Intelligence, or ML authority;
-- - create API, UI, cron, queue, retry, or scheduler execution.

create index hspp_evidence_assemblies_org_state_created_id_idx
on public.hspp_evidence_assemblies (
  organization_id,
  assembly_state,
  created_at,
  id
);

comment on index
  public.hspp_evidence_assemblies_org_state_created_id_idx
is
  'B7490-07Q13a recovery-discovery index. Supports bounded organization/state-scoped HSPP assembly reads with deterministic created_at/id ordering. It does not define Q12 pending/completed state, retry identity, or alter HSPP lifecycle, trust, or authority.';
