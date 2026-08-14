-- C-1D1: privacy-safe Crowd Intelligence location quality observability.
--
-- This table records aggregate outcomes for server-received location
-- observations only. It deliberately excludes organization, vehicle,
-- trip, user, latitude and longitude identifiers.
--
-- It does not change GPS acceptance rules, Crowd Intelligence scoring,
-- Route Safety scoring, or statistical-confidence semantics.

create table if not exists public.crowd_location_quality_stats (
  observed_date date not null,

  source text not null
    check (
      source in (
        'mobile',
        'hardware',
        'manual'
      )
    ),

  outcome text not null
    check (
      outcome in (
        'accepted',
        'jitter',
        'gps_spike'
      )
    ),

  observation_count bigint not null default 0
    check (observation_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    observed_date,
    source,
    outcome
  )
);

alter table public.crowd_location_quality_stats
  enable row level security;

revoke all
on table public.crowd_location_quality_stats
from public, anon, authenticated;

grant all
on table public.crowd_location_quality_stats
to service_role;

create or replace function public.increment_crowd_location_quality_stat(
  p_observed_date date,
  p_source text,
  p_outcome text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_observed_date is null then
    raise exception 'p_observed_date is required';
  end if;

  if p_source not in (
    'mobile',
    'hardware',
    'manual'
  ) then
    raise exception 'Unsupported location source';
  end if;

  if p_outcome not in (
    'accepted',
    'jitter',
    'gps_spike'
  ) then
    raise exception 'Unsupported quality outcome';
  end if;

  insert into public.crowd_location_quality_stats (
    observed_date,
    source,
    outcome,
    observation_count,
    updated_at
  )
  values (
    p_observed_date,
    p_source,
    p_outcome,
    1,
    now()
  )
  on conflict (
    observed_date,
    source,
    outcome
  )
  do update
  set
    observation_count =
      public.crowd_location_quality_stats.observation_count + 1,
    updated_at = now();
end;
$$;

revoke all
on function public.increment_crowd_location_quality_stat(
  date,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.increment_crowd_location_quality_stat(
  date,
  text,
  text
)
to service_role;

comment on table public.crowd_location_quality_stats is
  'C-1D1 privacy-safe aggregate observability for server-received HarborGuard location quality outcomes. Contains no raw trip, vehicle, user, organization or coordinate identifiers.';

comment on column public.crowd_location_quality_stats.observation_count is
  'Number of server-received location observations producing this source/date/quality outcome.';

comment on function public.increment_crowd_location_quality_stat(
  date,
  text,
  text
) is
  'Atomically increments a C-1D1 server-side location-quality aggregate without altering telemetry acceptance or Crowd Intelligence scoring.';
