-- Q14p
-- Immutable assembly-scoped positive operational-assessment checkpoint.
--
-- This table preserves a durable fact that a specific SEALED HSPP
-- assembly reached the exact controlled positive Q6 operational
-- assessment result.
--
-- Historical assembly, evidence, decision and membership rows remain
-- untouched.
--
-- This migration intentionally does NOT:
-- - insert a checkpoint at runtime;
-- - promote or supersede an assembly;
-- - change effective/current membership;
-- - detach evidence;
-- - return evidence to the Reservoir;
-- - select replacement evidence;
-- - reconstruct H2;
-- - seal or reassess an assembly;
-- - grant Route Safety, Crowd, ML or validation authority.
--
-- A later specialized persistence boundary must be responsible for
-- inserting this fact after independently validating the exact Q6
-- positive result.

create table public.hspp_assembly_positive_assessment_checkpoints (
  id uuid
    primary key
    default gen_random_uuid(),

  organization_id uuid
    not null,

  assembly_id uuid
    not null,

  assembly_decision_id uuid
    not null,

  evidence_id uuid
    not null,

  integrity_fingerprint text
    not null,

  checkpoint_version text
    not null
    default 'hspp-assembly-positive-assessment-checkpoint-v1',

  assessment_persistence_version text
    not null,

  assessment_policy_version text
    not null,

  trust_state text
    not null,

  operational_eligible boolean
    not null,

  crowd_eligible boolean
    not null,

  training_eligible boolean
    not null,

  validation_eligible boolean
    not null,

  assessment_reason text
    not null,

  assessed_at timestamptz
    not null,

  created_at timestamptz
    not null
    default now(),

  constraint hspp_positive_checkpoint_assembly_fk
    foreign key (
      organization_id,
      assembly_id
    )
    references public.hspp_evidence_assemblies (
      organization_id,
      id
    )
    on delete restrict,

  constraint hspp_positive_checkpoint_decision_fk
    foreign key (
      assembly_decision_id
    )
    references public.hspp_assembly_decisions (
      id
    )
    on delete restrict,

  constraint hspp_positive_checkpoint_evidence_fk
    foreign key (
      evidence_id
    )
    references public.hspp_evidence (
      id
    )
    on delete restrict,

  constraint hspp_positive_checkpoint_assembly_unique
    unique (
      organization_id,
      assembly_id
    ),

  constraint hspp_positive_checkpoint_fingerprint_format
    check (
      integrity_fingerprint ~ '^[a-f0-9]{64}$'
    ),

  constraint hspp_positive_checkpoint_version_exact
    check (
      checkpoint_version =
        'hspp-assembly-positive-assessment-checkpoint-v1'
    ),

  constraint hspp_positive_checkpoint_persistence_version_exact
    check (
      assessment_persistence_version =
        'hspp-corroborated-operational-assessment-persistence-v1'
    ),

  constraint hspp_positive_checkpoint_policy_version_exact
    check (
      assessment_policy_version =
        'hspp-corroborated-operational-assessment-v1'
    ),

  constraint hspp_positive_checkpoint_trust_exact
    check (
      trust_state =
        'CORROBORATED'
    ),

  constraint hspp_positive_checkpoint_operational_exact
    check (
      operational_eligible = true
    ),

  constraint hspp_positive_checkpoint_crowd_exact
    check (
      crowd_eligible = false
    ),

  constraint hspp_positive_checkpoint_training_exact
    check (
      training_eligible = false
    ),

  constraint hspp_positive_checkpoint_validation_exact
    check (
      validation_eligible = false
    ),

  constraint hspp_positive_checkpoint_reason_exact
    check (
      assessment_reason =
        'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED'
    )
);


create index hspp_positive_checkpoint_decision_lookup
  on public.hspp_assembly_positive_assessment_checkpoints (
    organization_id,
    assembly_decision_id
  );


create index hspp_positive_checkpoint_evidence_lookup
  on public.hspp_assembly_positive_assessment_checkpoints (
    organization_id,
    evidence_id
  );


create or replace function
  public.prevent_hspp_assembly_positive_assessment_checkpoint_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'HSPP positive-assessment checkpoints are immutable and cannot be changed.';
end;
$$;


revoke all
  on function
    public.prevent_hspp_assembly_positive_assessment_checkpoint_changes()
  from public,
       anon,
       authenticated,
       service_role;


create trigger
  hspp_positive_checkpoint_prevent_update
before update
on public.hspp_assembly_positive_assessment_checkpoints
for each row
execute function
  public.prevent_hspp_assembly_positive_assessment_checkpoint_changes();


create trigger
  hspp_positive_checkpoint_prevent_delete
before delete
on public.hspp_assembly_positive_assessment_checkpoints
for each row
execute function
  public.prevent_hspp_assembly_positive_assessment_checkpoint_changes();


alter table
  public.hspp_assembly_positive_assessment_checkpoints
enable row level security;


revoke all
  on table
    public.hspp_assembly_positive_assessment_checkpoints
  from public,
       anon,
       authenticated,
       service_role;


grant select
  on table
    public.hspp_assembly_positive_assessment_checkpoints
  to service_role;


comment on table
  public.hspp_assembly_positive_assessment_checkpoints
is
  'Append-only HSPP assembly-scoped checkpoint for the exact controlled positive Q6 operational-assessment result. Row existence preserves positive assessment provenance only. It does not by itself promote or supersede an assembly, alter historical or effective membership, detach or return evidence to the Reservoir, select replacement evidence, reconstruct a child assembly, or grant Route Safety, Crowd, ML or validation authority.';


comment on column
  public.hspp_assembly_positive_assessment_checkpoints.assembly_decision_id
is
  'Immutable assembly-decision provenance supplied by the future controlled checkpoint writer. The future writer must independently prove that the decision belongs to the same organization and assembly before insertion.';


comment on column
  public.hspp_assembly_positive_assessment_checkpoints.assessed_at
is
  'Exact caller-controlled Q6 assessedAt retry identity preserved by the positive checkpoint.';


comment on constraint
  hspp_positive_checkpoint_assembly_unique
on public.hspp_assembly_positive_assessment_checkpoints
is
  'At most one immutable controlled positive-assessment checkpoint may exist for one organization-scoped HSPP assembly.';
