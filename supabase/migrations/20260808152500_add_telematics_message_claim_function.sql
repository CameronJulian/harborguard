create or replace function public.claim_telematics_message(
  p_organization_id uuid,
  p_provider text,
  p_stream text,
  p_provider_message_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  claimed boolean,
  receipt_id uuid,
  processing_status text,
  attempt_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_receipt public.telematics_message_receipts%rowtype;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  if length(trim(coalesce(p_provider, ''))) = 0 then
    raise exception 'provider is required';
  end if;

  if length(trim(coalesce(p_stream, ''))) = 0 then
    raise exception 'stream is required';
  end if;

  if length(trim(coalesce(p_provider_message_id, ''))) = 0 then
    raise exception 'provider_message_id is required';
  end if;

  insert into public.telematics_message_receipts (
    organization_id,
    provider,
    stream,
    provider_message_id,
    processing_status,
    claimed_at,
    processed_at,
    last_failure_at,
    last_failure_message,
    attempt_count,
    metadata
  )
  values (
    p_organization_id,
    trim(p_provider),
    trim(p_stream),
    trim(p_provider_message_id),
    'processing',
    now(),
    null,
    null,
    null,
    1,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (
    organization_id,
    provider,
    stream,
    provider_message_id
  )
  do nothing
  returning *
  into v_receipt;

  if found then
    return query
    select
      true,
      v_receipt.id,
      v_receipt.processing_status,
      v_receipt.attempt_count;

    return;
  end if;

  select *
  into v_receipt
  from public.telematics_message_receipts
  where organization_id = p_organization_id
    and provider = trim(p_provider)
    and stream = trim(p_stream)
    and provider_message_id = trim(p_provider_message_id)
  for update;

  if not found then
    raise exception 'telematics receipt disappeared during claim';
  end if;

  if v_receipt.processing_status = 'failed' then
    update public.telematics_message_receipts
    set
      processing_status = 'processing',
      claimed_at = now(),
      processed_at = null,
      last_failure_at = null,
      last_failure_message = null,
      attempt_count = attempt_count + 1,
      metadata = coalesce(p_metadata, metadata)
    where id = v_receipt.id
    returning *
    into v_receipt;

    return query
    select
      true,
      v_receipt.id,
      v_receipt.processing_status,
      v_receipt.attempt_count;

    return;
  end if;

  return query
  select
    false,
    v_receipt.id,
    v_receipt.processing_status,
    v_receipt.attempt_count;
end;
$$;
