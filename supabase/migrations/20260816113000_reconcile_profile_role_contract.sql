-- HarborGuard C-1E9B2C
--
-- Reconciles the authoritative public.profiles.role database constraint
-- with role values already recognized by HarborGuard application and
-- database authorization contracts.
--
-- This is intentionally compatibility-preserving:
-- existing legacy-recognized roles are not removed in this change.
--
-- This migration does NOT:
-- - grant any new database privileges;
-- - alter organization membership;
-- - promote any ML model;
-- - change the route-risk model registry;
-- - change Route Safety inference.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'owner',
      'admin',
      'super_admin',
      'platform_admin',
      'operator',
      'viewer',
      'manager',
      'dock',
      'warehouse',
      'processing'
    )
  );

comment on column public.profiles.role is
  'Authoritative HarborGuard user role used by application RBAC and database authorization. Compatibility role set includes organization, platform and legacy operational roles currently referenced by HarborGuard contracts.';
