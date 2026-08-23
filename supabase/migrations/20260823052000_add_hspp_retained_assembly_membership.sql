-- B7490-14D1
-- Retained descendant assembly membership substrate.
--
-- This migration narrows the historical B07C1a lifetime
-- single-membership invariant without removing its safety purpose.
--
-- Historical/original rule after this migration:
--
--   Within one organization, one immutable HSPP evidence identity
--   may have at most one ORIGINAL assembly membership.
--
-- Controlled descendant exception:
--
--   The same exact immutable evidence identity may appear in a
--   descendant assembly only as RETAINED membership and only when:
--
--   1. the retained row identifies one exact pre-existing source
--      membership row;
--   2. source and retained rows have the same organization;
--   3. source and retained rows have the same evidence identity;
--   4. source and retained rows have the same integrity fingerprint;
--   5. immutable reconstruction provenance proves that the source
--      assembly is the immediate parent of the retained row's child
--      assembly.
--
-- The existing generic persist_hspp_evidence_assembly RPC is NOT
-- changed here. It continues to reject evidence that is already
-- assembled and therefore cannot create RETAINED memberships.
--
-- This migration does NOT:
--
-- - create H2 or any descendant assembly;
-- - create reconstruction persistence authority;
-- - detach evidence from H1;
-- - update or delete historical membership;
-- - return evidence to the Reservoir;
-- - change Reservoir discovery or eligibility;
-- - select replacement evidence;
-- - seal a reconstructed assembly;
-- - perform whole-composite validation;
-- - alter trust;
-- - grant Route Safety, Crowd Intelligence or ML authority;
-- - create API, cron or scheduler behavior.


alter table public.hspp_evidence_assembly_members
  add column membership_kind text not null
    default 'ORIGINAL',

  add column source_membership_id uuid null;


alter table public.hspp_evidence_assembly_members
  add constraint
    hspp_evidence_assembly_member_kind_valid
  check (
    membership_kind in (
      'ORIGINAL',
      'RETAINED'
    )
  ),

  add constraint
    hspp_evidence_assembly_member_source_shape
  check (
    (
      membership_kind = 'ORIGINAL'
      and source_membership_id is null
    )
    or
    (
      membership_kind = 'RETAINED'
      and source_membership_id is not null
    )
  ),

  add constraint
    hspp_evidence_assembly_member_source_not_self
  check (
    source_membership_id is null
    or source_membership_id <> id
  ),

  add constraint
    hspp_evidence_assembly_member_source_fk
  foreign key (
    source_membership_id
  )
  references public.hspp_evidence_assembly_members (
    id
  )
  on delete restrict;


-- ------------------------------------------------------------
-- Narrow B07C1a instead of removing its protection.
--
-- The historical constraint prevented every evidence identity from
-- appearing in more than one assembly for its entire lifetime.
--
-- ORIGINAL ownership remains unique.
--
-- RETAINED rows are excluded from this index because their legitimacy
-- is instead proven by the exact source-membership and immediate
-- reconstruction-parent checks below.
-- ------------------------------------------------------------

alter table public.hspp_evidence_assembly_members
  drop constraint
    hspp_evidence_assembly_members_org_evidence_single_assembly;


create unique index
  hspp_evidence_assembly_members_org_evidence_original_unique
on public.hspp_evidence_assembly_members (
  organization_id,
  evidence_id
)
where membership_kind = 'ORIGINAL';


-- ------------------------------------------------------------
-- Fail-closed retained-membership provenance enforcement.
-- ------------------------------------------------------------

create or replace function
  public.enforce_hspp_retained_assembly_membership_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_source_organization_id uuid;
  v_source_assembly_id uuid;
  v_source_evidence_id uuid;
  v_source_integrity_fingerprint text;
begin

  if new.membership_kind <> 'RETAINED' then
    return new;
  end if;


  select
    source.organization_id,
    source.assembly_id,
    source.evidence_id,
    source.evidence_integrity_fingerprint
  into
    v_source_organization_id,
    v_source_assembly_id,
    v_source_evidence_id,
    v_source_integrity_fingerprint
  from public.hspp_evidence_assembly_members source
  where
    source.id = new.source_membership_id;


  if not found then
    raise exception
      'Retained HSPP membership source does not exist.';
  end if;


  if
    v_source_organization_id <> new.organization_id
  then
    raise exception
      'Retained HSPP membership must preserve source organization.';
  end if;


  if
    v_source_evidence_id <> new.evidence_id
  then
    raise exception
      'Retained HSPP membership must preserve source evidence identity.';
  end if;


  if
    v_source_integrity_fingerprint <>
      new.evidence_integrity_fingerprint
  then
    raise exception
      'Retained HSPP membership must preserve source integrity fingerprint.';
  end if;


  if not exists (
    select 1
    from public.hspp_evidence_assembly_reconstructions reconstruction
    where
      reconstruction.organization_id =
        new.organization_id
      and reconstruction.parent_assembly_id =
        v_source_assembly_id
      and reconstruction.child_assembly_id =
        new.assembly_id
  ) then
    raise exception
      'Retained HSPP membership requires immediate parent-child reconstruction provenance.';
  end if;


  return new;
end;
$$;


create trigger
  enforce_hspp_retained_assembly_membership_insert
before insert
on public.hspp_evidence_assembly_members
for each row
execute function
  public.enforce_hspp_retained_assembly_membership_insert();


revoke all
on function
  public.enforce_hspp_retained_assembly_membership_insert()
from public;

revoke all
on function
  public.enforce_hspp_retained_assembly_membership_insert()
from anon;

revoke all
on function
  public.enforce_hspp_retained_assembly_membership_insert()
from authenticated;

revoke all
on function
  public.enforce_hspp_retained_assembly_membership_insert()
from service_role;


comment on column
  public.hspp_evidence_assembly_members.membership_kind
is
  'Composition-membership origin. ORIGINAL is the evidence identity''s single originating assembly membership within an organization. RETAINED is a descendant-composition reuse of that exact immutable evidence identity and requires an exact source_membership_id plus immediate parent-child reconstruction provenance.';


comment on column
  public.hspp_evidence_assembly_members.source_membership_id
is
  'For RETAINED membership only, the exact immutable parent-assembly membership row from which this descendant membership is retained. NULL for ORIGINAL membership.';


comment on index
  public.hspp_evidence_assembly_members_org_evidence_original_unique
is
  'B7490-14D1 narrowed single-origin invariant. Within one organization an immutable HSPP evidence identity may have at most one ORIGINAL membership. Controlled RETAINED descendant memberships are validated separately against exact immutable source membership and reconstruction provenance.';


comment on function
  public.enforce_hspp_retained_assembly_membership_insert()
is
  'B7490-14D1 fail-closed retained-membership provenance guard. RETAINED rows must preserve the exact organization, evidence identity and integrity fingerprint of one existing membership row whose assembly is the immediate reconstruction parent of the target child assembly. This function creates no assembly, reconstruction, trust, Reservoir or downstream authority.';