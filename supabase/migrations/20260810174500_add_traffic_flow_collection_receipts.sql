create table if not exists public.traffic_flow_collection_receipts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  collection_key text not null,

  processing_status text not null
    default 'processing',

  claimed_at timestamptz not null
    default now(),

  processed_at timestamptz null,

  last_failure_at timestamptz null,

  last_failure_message text null,

  attempt_count integer not null
    default 1,

  metadata jsonb null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint traffic_flow_collection_receipts_key_not_blank
    check (length(trim(collection_key)) > 0),

  constraint traffic_flow_collection_receipts_status_valid
    check (
      processing_status in (
        'processing',
        'processed',
        'failed'
      )
    ),

  constraint traffic_flow_collection_receipts_attempt_count_valid
    check (attempt_count >= 1),

  constraint traffic_flow_collection_receipts_identity_unique
    unique (
      organization_id,
      collection_key
    )
);

create index if not exists
traffic_flow_collection_receipts_status_idx
on public.traffic_flow_collection_receipts (
  organization_id,
  processing_status,
  claimed_at
);

alter table public.traffic_flow_collection_receipts
enable row level security;

grant all
on public.traffic_flow_collection_receipts
to service_role;

comment on table public.traffic_flow_collection_receipts is
'Atomic delivery-level receipt state for retry-safe scheduled traffic-flow collection.';

create or replace function public.claim_traffic_flow_collection(
  p_organization_id uuid,
  p_collection_key text,
  p_metadata jsonb default null
)
returns table (
  receipt_id uuid,
  claimed boolean,
  processing_status text,
  attempt_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_key text;
  v_receipt public.traffic_flow_collection_receipts%rowtype;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  v_key := trim(coalesce(p_collection_key, ''));

  if length(v_key) = 0 then
    raise exception 'collection_key is required';
  end if;

  insert into public.traffic_flow_collection_receipts (
    organization_id,
    collection_key,
    processing_status,
    claimed_at,
    attempt_count,
    metadata
  )
  values (
    p_organization_id,
    v_key,
    'processing',
    now(),
    1,
    p_metadata
  )
  on conflict (
    organization_id,
    collection_key
  )
  do nothing
  returning *
  into v_receipt;

  if found then
    return query
    select
      v_receipt.id,
      true,
      v_receipt.processing_status,
      v_receipt.attempt_count;

    return;
  end if;

  select *
  into v_receipt
  from public.traffic_flow_collection_receipts
  where organization_id = p_organization_id
    and collection_key = v_key
  for update;

  if not found then
    raise exception
      'traffic-flow collection receipt disappeared during claim';
  end if;

  if v_receipt.processing_status = 'failed' then
    update public.traffic_flow_collection_receipts
    set
      processing_status = 'processing',
      claimed_at = now(),
      processed_at = null,
      last_failure_at = null,
      last_failure_message = null,
      attempt_count = attempt_count + 1,
      metadata = coalesce(
        p_metadata,
        metadata
      ),
      updated_at = now()
    where id = v_receipt.id
    returning *
    into v_receipt;

    return query
    select
      v_receipt.id,
      true,
      v_receipt.processing_status,
      v_receipt.attempt_count;

    return;
  end if;

  return query
  select
    v_receipt.id,
    false,
    v_receipt.processing_status,
    v_receipt.attempt_count;
end;
$$;

create or replace function public.complete_traffic_flow_collection(
  p_receipt_id uuid,
  p_attempt_count integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if p_receipt_id is null then
    raise exception 'receipt_id is required';
  end if;

  if p_attempt_count is null or p_attempt_count < 1 then
    raise exception 'attempt_count must be at least 1';
  end if;

  update public.traffic_flow_collection_receipts
  set
    processing_status = 'processed',
    processed_at = now(),
    last_failure_at = null,
    last_failure_message = null,
    updated_at = now()
  where id = p_receipt_id
    and processing_status = 'processing'
    and attempt_count = p_attempt_count
  returning id
  into v_updated_id;

  return v_updated_id is not null;
end;
$$;

create or replace function public.fail_traffic_flow_collection(
  p_receipt_id uuid,
  p_attempt_count integer,
  p_failure_message text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_message text;
  v_updated_id uuid;
begin
  if p_receipt_id is null then
    raise exception 'receipt_id is required';
  end if;

  if p_attempt_count is null or p_attempt_count < 1 then
    raise exception 'attempt_count must be at least 1';
  end if;

  v_message :=
    nullif(
      trim(
        coalesce(
          p_failure_message,
          ''
        )
      ),
      ''
    );

  update public.traffic_flow_collection_receipts
  set
    processing_status = 'failed',
    last_failure_at = now(),
    last_failure_message = v_message,
    updated_at = now()
  where id = p_receipt_id
    and processing_status = 'processing'
    and attempt_count = p_attempt_count
  returning id
  into v_updated_id;

  return v_updated_id is not null;
end;
$$;

grant execute
on function public.claim_traffic_flow_collection(
  uuid,
  text,
  jsonb
)
to service_role;

grant execute
on function public.complete_traffic_flow_collection(
  uuid,
  integer
)
to service_role;

grant execute
on function public.fail_traffic_flow_collection(
  uuid,
  integer,
  text
)
to service_role;
