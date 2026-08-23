-- B7490-14C1
--
-- Immutable HSPP evidence-assembly reconstruction provenance.
--
-- This migration introduces provenance structure only.
--
-- It deliberately does NOT:
--
-- - create or reconstruct a child assembly;
-- - detach evidence from an existing assembly;
-- - mutate historical assembly membership;
-- - relax the existing single-assembly membership invariant;
-- - return evidence to the Reservoir;
-- - select replacement evidence;
-- - validate a reconstructed whole assembly;
-- - alter evidence trust;
-- - grant Route Safety, Crowd Intelligence or ML authority;
-- - create API, cron or scheduler behavior.
--
-- H1 therefore remains immutable.
--
-- Future reconstruction authority may atomically create a child
-- assembly and then bind that child to this provenance model, but
-- that authority is intentionally outside B7490-14C1.


create table public.hspp_evidence_assembly_reconstructions (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  parent_assembly_id uuid not null,

  child_assembly_id uuid not null,

  reconstruction_policy_version text not null,

  reconstruction_reason text not null,

  created_at timestamptz not null
    default now(),

  constraint hspp_reconstruction_policy_nonblank
    check (
      length(
        trim(reconstruction_policy_version)
      ) > 0
    ),

  constraint hspp_reconstruction_reason_nonblank
    check (
      length(
        trim(reconstruction_reason)
      ) > 0
    ),

  constraint hspp_reconstruction_parent_child_distinct
    check (
      parent_assembly_id <> child_assembly_id
    ),

  constraint hspp_reconstruction_org_identity_unique
    unique (
      organization_id,
      id
    ),

  constraint hspp_reconstruction_child_unique
    unique (
      organization_id,
      child_assembly_id
    ),

  constraint hspp_reconstruction_parent_fk
    foreign key (
      organization_id,
      parent_assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_reconstruction_child_fk
    foreign key (
      organization_id,
      child_assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict
);


create table public.hspp_evidence_assembly_reconstruction_changes (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  reconstruction_id uuid not null,

  change_ordinal integer not null,

  change_kind text not null,

  evidence_id uuid not null,

  evidence_integrity_fingerprint text not null,

  constraint hspp_reconstruction_change_ordinal_positive
    check (
      change_ordinal > 0
    ),

  constraint hspp_reconstruction_change_kind
    check (
      change_kind in (
        'REMOVED',
        'ADDED'
      )
    ),

  constraint hspp_reconstruction_change_fingerprint_sha256
    check (
      evidence_integrity_fingerprint ~
        '^[0-9a-f]{64}$'
    ),

  constraint hspp_reconstruction_change_reconstruction_fk
    foreign key (
      organization_id,
      reconstruction_id
    )
    references public.hspp_evidence_assembly_reconstructions (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_reconstruction_change_evidence_fk
    foreign key (
      organization_id,
      evidence_id,
      evidence_integrity_fingerprint
    )
    references public.hspp_evidence (
      organization_id,
      id,
      integrity_fingerprint
    )
    on delete restrict,

  constraint hspp_reconstruction_change_ordinal_unique
    unique (
      reconstruction_id,
      change_ordinal
    ),

  constraint hspp_reconstruction_change_evidence_unique
    unique (
      reconstruction_id,
      change_kind,
      evidence_id
    )
);


create index
  hspp_reconstruction_parent_idx
on public.hspp_evidence_assembly_reconstructions (
  organization_id,
  parent_assembly_id,
  created_at
);


create index
  hspp_reconstruction_child_idx
on public.hspp_evidence_assembly_reconstructions (
  organization_id,
  child_assembly_id
);


create index
  hspp_reconstruction_changes_idx
on public.hspp_evidence_assembly_reconstruction_changes (
  organization_id,
  reconstruction_id,
  change_ordinal
);


create or replace function
  public.prevent_hspp_reconstruction_provenance_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'HSPP evidence assembly reconstruction provenance is immutable and cannot be changed.';
end;
$$;


create trigger
  prevent_hspp_reconstruction_update_delete
before update or delete
on public.hspp_evidence_assembly_reconstructions
for each row
execute function
  public.prevent_hspp_reconstruction_provenance_changes();


create trigger
  prevent_hspp_reconstruction_change_update_delete
before update or delete
on public.hspp_evidence_assembly_reconstruction_changes
for each row
execute function
  public.prevent_hspp_reconstruction_provenance_changes();


alter table
  public.hspp_evidence_assembly_reconstructions
enable row level security;


alter table
  public.hspp_evidence_assembly_reconstruction_changes
enable row level security;


revoke all
on table
  public.hspp_evidence_assembly_reconstructions
from
  public,
  anon,
  authenticated;


revoke all
on table
  public.hspp_evidence_assembly_reconstruction_changes
from
  public,
  anon,
  authenticated;


grant select
on table
  public.hspp_evidence_assembly_reconstructions
to service_role;


grant select
on table
  public.hspp_evidence_assembly_reconstruction_changes
to service_role;


revoke all
on function
  public.prevent_hspp_reconstruction_provenance_changes()
from
  public,
  anon,
  authenticated,
  service_role;


comment on table
  public.hspp_evidence_assembly_reconstructions
is
  'B7490-14C1 immutable HSPP reconstruction lineage provenance. Each row binds one child assembly to one historical parent assembly with an explicit reconstruction reason and policy version. The row itself grants no reconstruction, trust, Reservoir, validation or downstream authority.';


comment on table
  public.hspp_evidence_assembly_reconstruction_changes
is
  'B7490-14C1 immutable reconstruction delta provenance. REMOVED and ADDED records bind exact organization-scoped evidence identities and SHA-256 integrity fingerprints to a parent-child reconstruction transition.';


comment on column
  public.hspp_evidence_assembly_reconstructions.parent_assembly_id
is
  'Historical parent assembly identity. The parent assembly and its immutable membership are not modified by this provenance record.';


comment on column
  public.hspp_evidence_assembly_reconstructions.child_assembly_id
is
  'Distinct descendant assembly identity. B7490-14C1 does not create this assembly and provides no child-assembly creation authority.';


comment on column
  public.hspp_evidence_assembly_reconstruction_changes.change_kind
is
  'Composition delta role. REMOVED identifies evidence excluded from the descendant composition; ADDED identifies replacement or newly introduced evidence.';


comment on column
  public.hspp_evidence_assembly_reconstruction_changes.evidence_integrity_fingerprint
is
  'Exact immutable SHA-256 fingerprint of the evidence identity participating in the reconstruction delta.';