alter table public.route_intelligence
    add column if not exists source_record_id text;

create unique index if not exists idx_route_intelligence_source_record
    on public.route_intelligence (
        organization_id,
        source,
        source_record_id
    );