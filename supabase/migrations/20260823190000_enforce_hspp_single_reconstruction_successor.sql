-- ============================================================
-- B7490-Q14AG21
-- Single immediate reconstruction-successor invariant.
-- ============================================================
--
-- Responsibility:
--
--   Preserve one deterministic reconstruction lineage by ensuring
--   that one organization-scoped historical parent assembly may
--   have at most one immediate reconstruction successor.
--
-- Why this is required:
--
--   Q14h locks the exact historical parent FOR UPDATE, which
--   serializes concurrent reconstruction transactions.
--
--   Serialization alone is not sufficient if two callers use
--   different caller-owned child UUIDs. After the first transaction
--   commits, the second transaction may obtain the parent lock and
--   continue unless the persisted lineage itself rejects a second
--   immediate successor.
--
-- This invariant therefore closes that race at the database layer.
--
-- Existing semantics preserved:
--
-- - childAssemblyId remains caller-owned retry identity;
-- - one child remains bound to one reconstruction;
-- - historical H1 membership remains immutable;
-- - H2 may itself later become a parent of H3;
-- - exact Q14h child retry semantics remain unchanged;
-- - Q14ad ceased-RETAINED protection remains unchanged;
-- - Q14ag14 leaf semantics remain unchanged;
-- - no replacement selection is performed here;
-- - no reconstruction is executed here;
-- - no assembly is sealed or assessed here;
-- - no trust, Reservoir or downstream authority is granted here;
-- - no API, cron or scheduler behavior is introduced here.
--
-- Fail closed before installing the invariant if historical data
-- already violates the one-successor-per-parent lineage model.
-- The UNIQUE constraint itself remains the authoritative concurrent
-- enforcement mechanism.
-- ============================================================

do $$
begin

  if exists (
    select
      1
    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
    group by
      reconstruction.organization_id,
      reconstruction.parent_assembly_id
    having
      count(*) > 1
  ) then

    raise exception
      'Cannot enforce HSPP single reconstruction successor: existing lineage contains multiple immediate successors for one parent.';

  end if;

end;
$$;


-- ============================================================
-- Historical replay compatibility.
--
-- B7490-14K1 / migration 20260823064000 already introduced the
-- exact authoritative UNIQUE constraint below.
--
-- Production currently retains that earlier constraint identity.
-- Therefore:
--
-- - preserve the existing exact constraint when already present;
-- - create it only if it is genuinely absent;
-- - fail closed if the same constraint name exists with a
--   different definition.
--
-- This makes clean migration replay deterministic without
-- dropping, replacing or weakening the existing invariant.
-- ============================================================

do $$
declare
  v_existing_definition text;
begin

  select
    pg_get_constraintdef(
      constraint_row.oid,
      true
    )
  into
    v_existing_definition
  from
    pg_constraint as constraint_row
  where
    constraint_row.conrelid =
      'public.hspp_evidence_assembly_reconstructions'::regclass

    and constraint_row.conname =
      'hspp_reconstruction_parent_unique';


  if v_existing_definition is null then

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
      on public.hspp_evidence_assembly_reconstructions
    is
      'B7490-Q14AG21 immutable lineage invariant. Within one organization, a historical assembly may have at most one immediate reconstruction successor. Descendants may independently become parents of later descendants, preserving a single reconstruction chain. This constraint grants no reconstruction, trust, Reservoir, validation or downstream authority.';

  elsif
    regexp_replace(
      v_existing_definition,
      '\s+',
      ' ',
      'g'
    ) <>
      'UNIQUE (organization_id, parent_assembly_id)'
  then

    raise exception
      'Existing HSPP reconstruction parent uniqueness constraint conflicts with Q14AG21: %',
      v_existing_definition;

  end if;

end;
$$;