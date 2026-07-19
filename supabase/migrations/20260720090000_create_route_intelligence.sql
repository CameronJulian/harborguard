create table if not exists public.route_intelligence (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    source text not null,
    event_type text not null,

    severity text,
    confidence integer,

    latitude double precision,
    longitude double precision,

    road_name text,
    route_segment text,

    weather_risk integer,
    traffic_risk integer,

    verified boolean not null default false,
    verification_count integer not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint route_intelligence_confidence_check
        check (
            confidence is null
            or confidence between 0 and 100
        ),

    constraint route_intelligence_weather_risk_check
        check (
            weather_risk is null
            or weather_risk between 0 and 100
        ),

    constraint route_intelligence_traffic_risk_check
        check (
            traffic_risk is null
            or traffic_risk between 0 and 100
        ),

    constraint route_intelligence_verification_count_check
        check (verification_count >= 0),

    constraint route_intelligence_latitude_check
        check (
            latitude is null
            or latitude between -90 and 90
        ),

    constraint route_intelligence_longitude_check
        check (
            longitude is null
            or longitude between -180 and 180
        )
);

create index if not exists idx_route_intelligence_org_created
    on public.route_intelligence (
        organization_id,
        created_at desc
    );

create index if not exists idx_route_intelligence_org_event
    on public.route_intelligence (
        organization_id,
        event_type
    );

create index if not exists idx_route_intelligence_coordinates
    on public.route_intelligence (
        latitude,
        longitude
    )
    where latitude is not null
      and longitude is not null;

create index if not exists idx_route_intelligence_verified
    on public.route_intelligence (
        organization_id,
        verified
    );

alter table public.route_intelligence
    enable row level security;

create policy "Users can read organization route intelligence"
on public.route_intelligence
for select
to authenticated
using (
    organization_id = public.current_user_org_id()
);

create policy "Users can insert organization route intelligence"
on public.route_intelligence
for insert
to authenticated
with check (
    organization_id = public.current_user_org_id()
);

create policy "Users can update organization route intelligence"
on public.route_intelligence
for update
to authenticated
using (
    organization_id = public.current_user_org_id()
)
with check (
    organization_id = public.current_user_org_id()
);

create policy "Service role can manage route intelligence"
on public.route_intelligence
for all
to service_role
using (true)
with check (true);

grant select, insert, update
on public.route_intelligence
to authenticated;

grant all
on public.route_intelligence
to service_role;
