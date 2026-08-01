create table if not exists public.intelligence_sources (
  id uuid primary key default gen_random_uuid(),

  source_key text not null unique,
  display_name text not null,

  classification text not null,
  data_mode text not null,

  enabled boolean not null default false,
  approved_for_ingestion boolean not null default false,

  base_confidence integer not null default 50,

  geographic_coverage text,
  update_frequency_minutes integer,

  attribution_required boolean not null default false,
  attribution_text text,

  commercial_use_status text not null default 'unconfirmed',
  privacy_classification text not null default 'non_personal',

  terms_url text,
  source_url text,

  last_successful_fetch_at timestamptz,
  last_failure_at timestamptz,
  last_failure_message text,

  successful_fetch_count bigint not null default 0,
  failed_fetch_count bigint not null default 0,

  reliability_score numeric(5,2),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint intelligence_sources_classification_check
    check (
      classification in (
        'official',
        'commercial',
        'community',
        'fleet',
        'sensor'
      )
    ),

  constraint intelligence_sources_data_mode_check
    check (
      data_mode in (
        'live',
        'historical',
        'live_and_historical'
      )
    ),

  constraint intelligence_sources_confidence_check
    check (
      base_confidence between 0 and 100
    ),

  constraint intelligence_sources_commercial_use_check
    check (
      commercial_use_status in (
        'approved',
        'restricted',
        'prohibited',
        'unconfirmed'
      )
    ),

  constraint intelligence_sources_privacy_check
    check (
      privacy_classification in (
        'non_personal',
        'potential_personal',
        'personal',
        'sensitive'
      )
    ),

  constraint intelligence_sources_update_frequency_check
    check (
      update_frequency_minutes is null
      or update_frequency_minutes > 0
    ),

  constraint intelligence_sources_fetch_counts_check
    check (
      successful_fetch_count >= 0
      and failed_fetch_count >= 0
    ),

  constraint intelligence_sources_reliability_check
    check (
      reliability_score is null
      or reliability_score between 0 and 100
    )
);

alter table public.intelligence_sources
enable row level security;

drop policy if exists
  "Authenticated users can read intelligence sources"
on public.intelligence_sources;

create policy
  "Authenticated users can read intelligence sources"
on public.intelligence_sources
for select
to authenticated
using (true);

drop policy if exists
  "Service role can manage intelligence sources"
on public.intelligence_sources;

create policy
  "Service role can manage intelligence sources"
on public.intelligence_sources
for all
to service_role
using (true)
with check (true);

grant select
on public.intelligence_sources
to authenticated;

grant all
on public.intelligence_sources
to service_role;

create index if not exists
  intelligence_sources_enabled_idx
on public.intelligence_sources (
  enabled,
  approved_for_ingestion
);

create index if not exists
  intelligence_sources_classification_idx
on public.intelligence_sources (
  classification,
  data_mode
);

insert into public.intelligence_sources (
  source_key,
  display_name,
  classification,
  data_mode,
  enabled,
  approved_for_ingestion,
  base_confidence,
  geographic_coverage,
  update_frequency_minutes,
  attribution_required,
  commercial_use_status,
  privacy_classification,
  metadata
)
values
  (
    'here_traffic',
    'HERE Traffic',
    'commercial',
    'live',
    true,
    true,
    70,
    'South Africa',
    5,
    true,
    'approved',
    'non_personal',
    '{"capabilities":["incidents","closures","hazards","traffic_flow"]}'::jsonb
  ),
  (
    'tomtom',
    'TomTom Traffic',
    'commercial',
    'live',
    true,
    true,
    75,
    'South Africa',
    5,
    true,
    'approved',
    'non_personal',
    '{"capabilities":["incidents","closures","hazards"]}'::jsonb
  ),
  (
    'openweather',
    'OpenWeather',
    'commercial',
    'live',
    true,
    true,
    80,
    'South Africa',
    10,
    true,
    'approved',
    'non_personal',
    '{"capabilities":["rain","wind","fog","weather_risk"]}'::jsonb
  ),
  (
    'route_safety',
    'HarborGuard Road User Reports',
    'community',
    'live',
    true,
    true,
    40,
    'South Africa',
    null,
    false,
    'approved',
    'potential_personal',
    '{"requiresVerification":true}'::jsonb
  ),
  (
    'vision_event',
    'HarborGuard Vision Events',
    'sensor',
    'live',
    true,
    true,
    60,
    'South Africa',
    null,
    false,
    'approved',
    'potential_personal',
    '{"requiresReview":true}'::jsonb
  ),
  (
    'city_of_cape_town',
    'City of Cape Town',
    'official',
    'live_and_historical',
    false,
    false,
    95,
    'City of Cape Town',
    null,
    true,
    'unconfirmed',
    'non_personal',
    '{"status":"awaiting_machine_readable_source_and_permission"}'::jsonb
  ),
  (
    'western_cape_government',
    'Western Cape Government',
    'official',
    'live_and_historical',
    false,
    false,
    95,
    'Western Cape',
    null,
    true,
    'unconfirmed',
    'non_personal',
    '{"status":"awaiting_machine_readable_source_and_permission"}'::jsonb
  ),
  (
    'saps_statistics',
    'SAPS Crime Statistics',
    'official',
    'historical',
    false,
    false,
    90,
    'South Africa',
    null,
    true,
    'unconfirmed',
    'non_personal',
    '{"mustNeverBePresentedAsLive":true}'::jsonb
  )
on conflict (source_key)
do nothing;
