-- Correct the PostgreSQL-truncated Q14r RPC identifier without recreating
-- or changing the existing function body, security mode, ACLs, or authority.

ALTER FUNCTION public.persist_hspp_positive_assessment_checkpoint_under_execution_lea(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz
)
RENAME TO persist_hspp_positive_assessment_checkpoint_under_lease;