-- B7490-07Q13e5c
-- Give the Q13e5b fenced completion RPC an explicit PostgreSQL-safe name.
-- ALTER FUNCTION preserves the existing function body, ownership and identity.

alter function public.record_hspp_assembly_assessment_completion_under_execution_leas(
  uuid,
  uuid,
  uuid
)
rename to record_hspp_assembly_assessment_completion_with_lease;

revoke all
on function public.record_hspp_assembly_assessment_completion_with_lease(
  uuid,
  uuid,
  uuid
)
from public;

grant execute
on function public.record_hspp_assembly_assessment_completion_with_lease(
  uuid,
  uuid,
  uuid
)
to service_role;

comment on function public.record_hspp_assembly_assessment_completion_with_lease(
  uuid,
  uuid,
  uuid
)
is 'B7490 Q13e5b recovery-only token-fenced immutable assessment completion writer. PostgreSQL-safe canonical RPC identifier.';

notify pgrst, 'reload schema';