-- HarborGuard Step 842.
-- REVIEW CANDIDATE ONLY: DO NOT DEPLOY.
--
-- Existing public tables were confirmed owned by postgres
-- in the Step 841B production metadata audit.
--
-- This section addresses unsafe privileges on existing
-- public tables and defaults for future postgres-owned tables.
--
-- It does NOT correct supabase_admin default privileges.
-- A separate authorized remediation is still required.
--
-- Production application impact, migration dependencies and
-- execution permissions must be reviewed before deployment.

REVOKE TRUNCATE, TRIGGER, MAINTAIN
ON ALL TABLES IN SCHEMA public
FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE TRUNCATE, TRIGGER, MAINTAIN
ON TABLES FROM PUBLIC, anon, authenticated;
