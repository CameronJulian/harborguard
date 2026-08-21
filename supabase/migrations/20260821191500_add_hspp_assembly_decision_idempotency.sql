-- ============================================================
-- B7490-07G3
-- HSPP B11E logical assembly-decision idempotency
-- ============================================================
--
-- One SEALED HSPP assembly has a database-immutable membership set.
--
-- Therefore one logical B11E decision identity is:
--
--   organization_id
--   assembly_id
--   assembly_scan_version
--   assembly_decision_policy_version
--
-- This migration deliberately does NOT delete, merge, update, or
-- rewrite historical provenance.
--
-- If historical duplicates already violate the new identity, the
-- migration fails closed and requires explicit investigation.
-- ============================================================


-- ------------------------------------------------------------
-- Historical duplicate guard
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select
      organization_id,
      assembly_id,
      assembly_scan_version,
      assembly_decision_policy_version
    from
      public.hspp_assembly_decisions
    group by
      organization_id,
      assembly_id,
      assembly_scan_version,
      assembly_decision_policy_version
    having
      count(*) > 1
  ) then
    raise exception
      'Cannot enforce HSPP assembly-decision logical identity: historical duplicate logical decisions exist.';
  end if;
end;
$$;


-- ------------------------------------------------------------
-- Authoritative concurrent retry invariant
-- ------------------------------------------------------------

alter table
  public.hspp_assembly_decisions
add constraint
  hspp_assembly_decisions_logical_identity_unique
unique (
  organization_id,
  assembly_id,
  assembly_scan_version,
  assembly_decision_policy_version
);


comment on constraint
  hspp_assembly_decisions_logical_identity_unique
on public.hspp_assembly_decisions
is
  'B7490-07G3 authoritative logical B11E decision identity. Because SEALED assembly membership is database-immutable, one organization + assembly + B11C scan version + B11D decision-policy version may persist at most one immutable provenance row. Concurrent identical retries resolve through PostgreSQL 23505 and tenant-scoped provenance verification; conflicting retries fail closed.';