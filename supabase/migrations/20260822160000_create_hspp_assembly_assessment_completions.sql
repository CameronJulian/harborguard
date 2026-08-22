-- ============================================================
-- B7490-07Q13d4
-- Immutable whole-Q12 completion checkpoint
-- ============================================================
--
-- Q13d1 established one immutable caller-owned assessment retry
-- identity for one organization-scoped HSPP assembly.
--
-- Q13d2 established the sole atomic claim-or-recover boundary for
-- that retry identity.
--
-- Q13d3/Q13d3a proved that replaying the existing Q9 -> Q12 chain
-- with that same canonical retry identity is safe:
--
-- - B07K/B11F4 branch selection does not depend on assessment state
--   written by Q9/Q8/B11F6/Q6;
-- - B11F6 retry is deterministic under the same assessedAt;
-- - Q6 retry is deterministic under the same assessedAt.
--
-- The remaining recovery ambiguity is therefore one fact only:
--
--   has the whole Q12 invocation for this assembly's canonical
--   retry identity already reached its defined terminal result?
--
-- One row in this table is that immutable completion fact.
--
-- The row deliberately does NOT duplicate assessed_at.
--
-- The canonical assessed_at remains owned exclusively by
-- hspp_assembly_assessment_retry_identities. Because that table has
-- exactly one immutable identity per organization-scoped assembly,
-- this completion row is transitively bound to that exact identity.
--
-- created_at below is checkpoint-row persistence provenance only.
-- It is NOT the Q12 assessedAt retry identity and is not used to
-- reconstruct assessment time.
--
-- This migration intentionally creates NO completion writer/RPC and
-- NO SEALED -> Q12 recovery runner. A later separately audited
-- boundary must prove that Q12 has returned its terminal result before
-- inserting this completion fact.
--
-- Row existence does not independently grant or change evidence trust,
-- operational eligibility, Route Safety authority, Crowd eligibility,
-- training eligibility, validation eligibility or physical-world truth.

create table public.hspp_assembly_assessment_completions (
  organization_id uuid not null,

  assembly_id uuid not null,

  completion_version text not null
    default 'hspp-assembly-assessment-completion-v1',

  created_at timestamptz not null
    default now(),

  constraint hspp_assembly_assessment_completions_pk
    primary key (
      organization_id,
      assembly_id
    ),

  constraint hspp_assembly_assessment_completions_retry_identity_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_assembly_assessment_retry_identities (
      organization_id,
      assembly_id
    )
    on delete restrict,

  constraint hspp_assembly_assessment_completion_version_not_blank
    check (
      length(
        btrim(
          completion_version
        )
      ) > 0
    )
);

alter table
  public.hspp_assembly_assessment_completions
enable row level security;

-- Q13d4 is deliberately dormant.
--
-- No caller receives table-level write capability here. A future
-- audited completion boundary may become the sole intended writer.

revoke all
on table public.hspp_assembly_assessment_completions
from public, anon, authenticated, service_role;

grant select
on table public.hspp_assembly_assessment_completions
to service_role;

-- ------------------------------------------------------------
-- Immutable completion fact
-- ------------------------------------------------------------

create or replace function
  public.prevent_hspp_assembly_assessment_completion_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'HSPP assembly assessment completions are immutable.';
end;
$$;

create trigger
  hspp_assembly_assessment_completions_prevent_update
before update
on public.hspp_assembly_assessment_completions
for each row
execute function
  public.prevent_hspp_assembly_assessment_completion_changes();

create trigger
  hspp_assembly_assessment_completions_prevent_delete
before delete
on public.hspp_assembly_assessment_completions
for each row
execute function
  public.prevent_hspp_assembly_assessment_completion_changes();

revoke all
on function
  public.prevent_hspp_assembly_assessment_completion_changes()
from public, anon, authenticated;

comment on table
  public.hspp_assembly_assessment_completions
is
  'B7490-07Q13d4 immutable whole-Q12 completion checkpoint. One row certifies that the Q12 invocation for one organization-scoped HSPP assembly and its already-claimed immutable retry identity reached its defined terminal result. Row existence is the completion fact. The row does not duplicate assessed_at and grants no new trust, eligibility or authority.';

comment on column
  public.hspp_assembly_assessment_completions.completion_version
is
  'Version of the immutable HSPP assembly-assessment completion checkpoint contract.';

comment on column
  public.hspp_assembly_assessment_completions.created_at
is
  'Persistence provenance for the immutable completion row only. It is not the Q12 assessedAt retry identity and must not be used to reconstruct assessment time.';
