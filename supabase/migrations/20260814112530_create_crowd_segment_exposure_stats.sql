create table if not exists public.crowd_segment_exposure_stats (
  id uuid primary key default gen_random_uuid(),

  segment_key text not null,

  direction_bucket smallint not null
    check (direction_bucket >= 0 and direction_bucket <= 7),

  hour_bucket smallint not null
    check (hour_bucket >= 0 and hour_bucket <= 23),

  observed_date date not null,

  traversal_count bigint not null
    check (traversal_count > 0),

  sample_count bigint not null
    check (sample_count > 0),

  first_observed_at timestamptz not null,

  last_observed_at timestamptz not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint crowd_segment_exposure_stats_time_order_check
    check (last_observed_at >= first_observed_at)
);

create unique index if not exists
  crowd_segment_exposure_stats_bucket_uidx
on public.crowd_segment_exposure_stats (
  segment_key,
  direction_bucket,
  hour_bucket,
  observed_date
);

create index if not exists
  crowd_segment_exposure_stats_segment_time_idx
on public.crowd_segment_exposure_stats (
  segment_key,
  observed_date desc,
  hour_bucket,
  direction_bucket
);

create index if not exists
  crowd_segment_exposure_stats_observed_date_idx
on public.crowd_segment_exposure_stats (
  observed_date desc
);

alter table public.crowd_segment_exposure_stats
  enable row level security;

revoke all
on table public.crowd_segment_exposure_stats
from anon, authenticated;

grant all
on table public.crowd_segment_exposure_stats
to service_role;

create or replace function public.aggregate_crowd_segment_exposure_stats(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  aggregated_rows bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_aggregated_rows bigint := 0;
begin
  if (
    p_start_date is not null
    and p_end_date is not null
    and p_end_date < p_start_date
  ) then
    raise exception
      'p_end_date must be greater than or equal to p_start_date';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:crowd_segment_exposure_stats',
      0
    )
  );

  insert into public.crowd_segment_exposure_stats (
    segment_key,
    direction_bucket,
    hour_bucket,
    observed_date,
    traversal_count,
    sample_count,
    first_observed_at,
    last_observed_at,
    updated_at
  )
  select
    traversals.segment_key,
    traversals.direction_bucket,
    traversals.hour_bucket,
    traversals.observed_date,
    count(*)::bigint as traversal_count,
    sum(traversals.sample_count)::bigint as sample_count,
    min(traversals.first_seen_at) as first_observed_at,
    max(traversals.last_seen_at) as last_observed_at,
    now() as updated_at
  from public.crowd_segment_traversals as traversals
  where
    (
      p_start_date is null
      or traversals.observed_date >= p_start_date
    )
    and (
      p_end_date is null
      or traversals.observed_date <= p_end_date
    )
  group by
    traversals.segment_key,
    traversals.direction_bucket,
    traversals.hour_bucket,
    traversals.observed_date
  on conflict (
    segment_key,
    direction_bucket,
    hour_bucket,
    observed_date
  )
  do update
  set
    traversal_count = excluded.traversal_count,
    sample_count = excluded.sample_count,
    first_observed_at = excluded.first_observed_at,
    last_observed_at = excluded.last_observed_at,
    updated_at = excluded.updated_at;

  get diagnostics
    v_aggregated_rows = row_count;

  return query
  select v_aggregated_rows;
end;
$$;

revoke all
on function public.aggregate_crowd_segment_exposure_stats(
  date,
  date
)
from public;

grant execute
on function public.aggregate_crowd_segment_exposure_stats(
  date,
  date
)
to service_role;

comment on table public.crowd_segment_exposure_stats is
  'Privacy-separated C-1B daily exposure statistics aggregated from anonymous completed-trip crowd_segment_traversals observations.';

comment on column public.crowd_segment_exposure_stats.segment_key is
  'Canonical rounded-coordinate-grid key compatible with HarborGuard road-risk segment identity.';

comment on column public.crowd_segment_exposure_stats.direction_bucket is
  'Eight-way movement-direction bucket inherited from crowd_segment_traversals: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW.';

comment on column public.crowd_segment_exposure_stats.hour_bucket is
  'UTC hour inherited from the source anonymous traversal observations.';

comment on column public.crowd_segment_exposure_stats.traversal_count is
  'Count of anonymous completed-trip traversal buckets contributing to this segment, direction, UTC hour and observed date.';

comment on column public.crowd_segment_exposure_stats.sample_count is
  'Sum of accepted GPS sample counts across the anonymous traversal buckets contributing to this aggregate.';

comment on function public.aggregate_crowd_segment_exposure_stats(
  date,
  date
) is
  'Idempotently recomputes daily anonymous crowd exposure statistics for an optional inclusive observed-date range without changing Route Safety production scoring.';