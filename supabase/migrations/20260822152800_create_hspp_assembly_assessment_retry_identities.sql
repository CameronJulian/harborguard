-- ============================================================
-- B7490-07Q13d1
-- Immutable assembly-bound assessment retry identity
-- ============================================================
--
-- SEALED HSPP recovery can already rediscover:
--
--   organization_id
--   assembly_id
--
-- Q12 additionally requires one caller-owned deterministic assessedAt
-- value which must remain stable across persistence retries.
--
-- Existing assembly lifecycle timestamps are NOT that identity:
--
--   hspp_evidence_assemblies.created_at
--   hspp_evidence_assemblies.sealed_at
--
-- Existing evidence assessed_at is evidence-level assessment provenance
-- and does not unambiguously bind one Q12 execution identity to one
-- persisted assembly.
--
-- This table therefore stores exactly one immutable caller-owned
-- assessment retry identity for one organization-scoped assembly.
--
-- The existence of a row proves ONLY that a retry identity has been
-- reserved/persisted for that assembly.
--
-- It does NOT prove:
--
-- - that Q12 has started;
-- - that Q12 is pending;
-- - that Q12 completed;
-- - that any member assessment was persisted;
-- - that any operational assessment was persisted;
-- - that the assembly is operationally eligible;
-- - that evidence is corroborated, verified or physically true;
-- - any Route Safety, Crowd Intelligence, ML or validation authority.
--
-- B7490-07Q13d1 intentionally creates NO writer/RPC and NO recovery
-- runner. A later separately audited boundary may claim or recover this
-- identity before any SEALED -> Q12 execution is permitted.

create table public.hspp_assembly_assessment_retry_identities (
  organization_id uuid not null,

  assembly_id uuid not null,

  retry_identity_version text not null
    default 'hspp-assembly-assessment-retry-identity-v1',

  assessed_at timestamptz not null,

  created_at timestamptz not null
    default now(),

  constraint hspp_assembly_assessment_retry_identities_pk
    primary key (
      organization_id,
      assembly_id
    ),

  constraint hspp_assembly_assessment_retry_identities_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_assembly_assessment_retry_identity_version_not_blank
    check (
      length(
        btrim(
          retry_identity_version
        )
      ) > 0
    )
);

alter table
  public.hspp_assembly_assessment_retry_identities
enable row level security;

-- The table is deliberately not writable through authenticated or
-- service-role table privileges in Q13d1.
--
-- A later audited persistence primitive must become the sole intended
-- write boundary. Until then, this schema is a dormant prerequisite.

revoke all
on table public.hspp_assembly_assessment_retry_identities
from public, anon, authenticated, service_role;

grant select
on table public.hspp_assembly_assessment_retry_identities
to service_role;

-- ------------------------------------------------------------
-- Immutable retry identity
-- ------------------------------------------------------------

create or replace function
  public.prevent_hspp_assembly_assessment_retry_identity_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'HSPP assembly assessment retry identities are immutable.';
end;
$$;

create trigger
  hspp_assembly_assessment_retry_identities_prevent_update
before update
on public.hspp_assembly_assessment_retry_identities
for each row
execute function
  public.prevent_hspp_assembly_assessment_retry_identity_changes();

create trigger
  hspp_assembly_assessment_retry_identities_prevent_delete
before delete
on public.hspp_assembly_assessment_retry_identities
for each row
execute function
  public.prevent_hspp_assembly_assessment_retry_identity_changes();

revoke all
on function
  public.prevent_hspp_assembly_assessment_retry_identity_changes()
from public, anon, authenticated;

comment on table
  public.hspp_assembly_assessment_retry_identities
is
  'B7490-07Q13d1 immutable assembly-bound assessment retry identity. One row binds one organization-scoped HSPP assembly to one caller-owned assessed_at value for deterministic downstream assessment retry. Row existence does not mean Q12 started, is pending, or completed and grants no trust, eligibility or authority.';

comment on column
  public.hspp_assembly_assessment_retry_identities.assessed_at
is
  'Caller-owned deterministic assessment retry identity reserved for this exact organization-scoped assembly. It is not derived from assembly created_at or sealed_at and has no database wall-clock default.';

comment on column
  public.hspp_assembly_assessment_retry_identities.created_at
is
  'Persistence provenance for the retry-identity row only. It is not the Q12 assessedAt retry identity and does not represent Q12 start or completion time.';
