create table if not exists public.traffic_model_evaluations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  trip_id uuid
    references public.vehicle_trips(id)
    on delete set null,

  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,

  production_traffic_score integer not null,
  production_traffic_level text not null,
  production_traffic_contribution integer not null,

  experimental_model text not null,
  experimental_score integer not null,
  experimental_level text not null,
  production_applied boolean not null default false,

  route_component_score integer,
  type_severity_component_score integer,
  provider_component_score integer,

  weights jsonb not null,
  thresholds jsonb not null,
  metadata jsonb,

  created_at timestamptz not null default now()
);

alter table public.traffic_model_evaluations
enable row level security;

drop policy if exists
  "traffic_model_evaluations_select_own_org"
on public.traffic_model_evaluations;

create policy
  "traffic_model_evaluations_select_own_org"
on public.traffic_model_evaluations
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists
  "traffic_model_evaluations_insert_own_org"
on public.traffic_model_evaluations;

create policy
  "traffic_model_evaluations_insert_own_org"
on public.traffic_model_evaluations
for insert
to authenticated
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

create index if not exists
  traffic_model_evaluations_org_created_idx
on public.traffic_model_evaluations (
  organization_id,
  created_at desc
);

create index if not exists
  traffic_model_evaluations_trip_created_idx
on public.traffic_model_evaluations (
  trip_id,
  created_at desc
);

create index if not exists
  traffic_model_evaluations_vehicle_created_idx
on public.traffic_model_evaluations (
  vehicle_id,
  created_at desc
);

create index if not exists
  traffic_model_evaluations_model_created_idx
on public.traffic_model_evaluations (
  experimental_model,
  created_at desc
);
