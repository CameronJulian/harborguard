alter table public.route_safety_alerts
add column if not exists provider_last_seen jsonb
not null default '{}'::jsonb;

comment on column public.route_safety_alerts.provider_last_seen is
'Per-provider last observation timestamps keyed by provider source.';

update public.route_safety_alerts
set provider_last_seen = (
  select coalesce(
    jsonb_object_agg(
      provider_source,
      coalesce(
        route_safety_alerts.last_provider_confirmation_at,
        route_safety_alerts.verified_at,
        route_safety_alerts.created_at,
        now()
      )
    ),
    '{}'::jsonb
  )
  from unnest(route_safety_alerts.provider_sources) as provider_source
)
where
  cardinality(provider_sources) > 0
  and provider_last_seen = '{}'::jsonb;
