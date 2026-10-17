-- Remove dangerous table-level privileges from mission tracking.
-- Row-level security does not protect TRUNCATE.
-- Preserve existing data operations and GPS tracking workflows.
-- Mission and driver authorization will be audited separately.

REVOKE TRUNCATE, TRIGGER, REFERENCES
ON public.mission_tracking
FROM anon, authenticated;
