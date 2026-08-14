create table if not exists public.crowd_segment_traversals (
  id uuid primary key default gen_random_uuid(),

  segment_key text not null,

  direction_bucket smallint not null
    check (direction_bucket >= 0 and direction_bucket <= 7),

  hour_bucket smallint not null
    check (hour_bucket >= 0 and hour_bucket <= 23),

  observed_date date not null,

  trip_token text not null
    check (length(trim(trip_token)) = 64),

  sample_count integer not null default 1
    check (sample_count > 0),

  first_seen_at timestamptz not null,

  last_seen_at timestamptz not null,

  created_at timestamptz not null default now(),

  constraint crowd_segment_traversals_time_order_check
    check (last_seen_at >= first_seen_at)
);

create unique index if not exists
  crowd_segment_traversals_trip_segment_bucket_uidx
on public.crowd_segment_traversals (
  trip_token,
  segment_key,
  direction_bucket,
  hour_bucket,
  observed_date
);

create index if not exists
  crowd_segment_traversals_segment_time_idx
on public.crowd_segment_traversals (
  segment_key,
  observed_date desc,
  hour_bucket
);

create index if not exists
  crowd_segment_traversals_observed_date_idx
on public.crowd_segment_traversals (
  observed_date desc
);

alter table public.crowd_segment_traversals
  enable row level security;

revoke all
on table public.crowd_segment_traversals
from anon, authenticated;

grant all
on table public.crowd_segment_traversals
to service_role;

comment on table public.crowd_segment_traversals is
  'Privacy-separated C-1 journey exposure observations. Each row represents one anonymous completed-trip traversal of a rounded-coordinate road segment within a direction, hour and date bucket.';

comment on column public.crowd_segment_traversals.segment_key is
  'Canonical rounded-coordinate-grid key compatible with HarborGuard road-risk segment identity: latitude rounded to 3 decimals, colon, longitude rounded to 3 decimals.';

comment on column public.crowd_segment_traversals.trip_token is
  'One-way SHA-256 trip-scoped token used only for idempotency. Raw trip, vehicle, user and organization identifiers are intentionally excluded.';

comment on column public.crowd_segment_traversals.direction_bucket is
  'Eight-way movement-direction bucket: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW.';

comment on column public.crowd_segment_traversals.hour_bucket is
  'UTC hour in which the segment traversal was observed.';

comment on column public.crowd_segment_traversals.sample_count is
  'Number of accepted GPS samples contributing to this completed-trip segment traversal bucket.';