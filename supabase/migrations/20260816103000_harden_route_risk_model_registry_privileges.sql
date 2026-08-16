-- HarborGuard C-1E9B0
--
-- Hardens direct table privileges on the route-risk model registry.
--
-- The registry remains readable:
-- - authenticated users through existing organization-scoped RLS;
-- - service_role for server-side read access.
--
-- Direct lifecycle mutation remains prohibited.
--
-- This migration intentionally does NOT:
-- - register a model;
-- - approve a model;
-- - reject a model;
-- - start shadow mode;
-- - activate a model;
-- - retire a model;
-- - create a lifecycle RPC;
-- - alter Route Safety inference.

revoke all
on table public.route_risk_model_registry
from anon;

revoke all
on table public.route_risk_model_registry
from authenticated;

revoke all
on table public.route_risk_model_registry
from service_role;

grant select
on table public.route_risk_model_registry
to authenticated;

grant select
on table public.route_risk_model_registry
to service_role;

comment on table public.route_risk_model_registry is
  'HarborGuard route-risk ML model lifecycle registry. Direct runtime access is read-only. Lifecycle mutation must occur only through future explicitly authorized and validated transition functions. Registry state does not by itself affect Route Safety inference.';
