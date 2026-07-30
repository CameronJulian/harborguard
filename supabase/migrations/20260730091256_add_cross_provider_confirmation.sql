alter table public.route_safety_alerts
add column if not exists provider_sources text[]
not null default '{}'::text[];

alter table public.route_safety_alerts
add column if not exists provider_confirmation_count integer
not null default 0;

alter table public.route_safety_alerts
add column if not exists provider_confidence integer
not null default 0;

alter table public.route_safety_alerts
add column if not exists last_provider_confirmation_at timestamptz;

alter table public.route_safety_alerts
drop constraint if exists route_safety_alerts_provider_confirmation_count_check;

alter table public.route_safety_alerts
add constraint route_safety_alerts_provider_confirmation_count_check
check (provider_confirmation_count >= 0);

alter table public.route_safety_alerts
drop constraint if exists route_safety_alerts_provider_confidence_check;

alter table public.route_safety_alerts
add constraint route_safety_alerts_provider_confidence_check
check (provider_confidence between 0 and 100);

update public.route_safety_alerts
set
  provider_sources = array[source],
  provider_confirmation_count = 1,
  provider_confidence = 60,
  last_provider_confirmation_at =
    coalesce(verified_at, created_at, now())
where source in ('here_traffic', 'tomtom')
  and cardinality(provider_sources) = 0;
