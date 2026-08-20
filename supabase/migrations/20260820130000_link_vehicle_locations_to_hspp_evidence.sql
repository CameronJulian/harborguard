-- HSPP-007B: exact HSPP provenance for persisted vehicle locations.
--
-- This migration establishes provenance identity only.
-- It intentionally does NOT:
--   - make HSPP evidence production authority;
--   - change existing vehicle-location readers;
--   - gate Fleet, Crowd Intelligence, Route Safety or ML;
--   - require HSPP provenance for mobile/manual historical rows.
--
-- NULL hspp_evidence_id means that the vehicle-location row is not
-- currently bound to an HSPP evidence record.

alter table public.hspp_evidence
  add constraint hspp_evidence_org_id_unique
  unique (organization_id, id);

alter table public.vehicle_locations
  add column hspp_evidence_id uuid;

alter table public.vehicle_locations
  add constraint vehicle_locations_hspp_evidence_identity_fkey
  foreign key (
    organization_id,
    hspp_evidence_id
  )
  references public.hspp_evidence (
    organization_id,
    id
  )
  on delete restrict;

create unique index
  vehicle_locations_hspp_evidence_id_unique
on public.vehicle_locations (
  hspp_evidence_id
)
where hspp_evidence_id is not null;

create index
  vehicle_locations_org_hspp_evidence_idx
on public.vehicle_locations (
  organization_id,
  hspp_evidence_id
)
where hspp_evidence_id is not null;

comment on column
  public.vehicle_locations.hspp_evidence_id
is
  'Optional exact HarborGuard Safety Provenance Protocol evidence identity for this vehicle-location row. NULL denotes an unlinked location. Presence of this reference does not itself authorize operational use; HSPP integrity, validation, assessment, trust and eligibility must still be evaluated by the operational-use policy.';
