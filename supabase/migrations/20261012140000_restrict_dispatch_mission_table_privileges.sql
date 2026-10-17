-- Remove dangerous table-level privileges from dispatch clients.
-- Row-level security does not protect TRUNCATE.
-- Preserve SELECT, INSERT and UPDATE for existing application flows.
-- Dispatch role authorization will be audited separately.

REVOKE TRUNCATE, TRIGGER, REFERENCES
ON public.dispatch_missions
FROM anon, authenticated;