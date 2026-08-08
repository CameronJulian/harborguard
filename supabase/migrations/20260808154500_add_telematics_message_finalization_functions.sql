create or replace function public.complete_telematics_message(
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

  update public.telematics_message_receipts
  set
    processing_status = 'processed',
    processed_at = now(),
    last_failure_at = null,
    last_failure_message = null
  where id = p_receipt_id
    and processing_status = 'processing'
    and attempt_count = p_attempt_count
  returning id
  into v_updated_id;

  return v_updated_id is not null;
end;
$$;

create or replace function public.fail_telematics_message(
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
  v_updated_id uuid;
begin
  if p_receipt_id is null then
    raise exception 'receipt_id is required';
  end if;

  if p_attempt_count is null or p_attempt_count < 1 then
    raise exception 'attempt_count must be at least 1';
  end if;

  if length(trim(coalesce(p_failure_message, ''))) = 0 then
    raise exception 'failure_message is required';
  end if;

  update public.telematics_message_receipts
  set
    processing_status = 'failed',
    processed_at = null,
    last_failure_at = now(),
    last_failure_message = trim(p_failure_message)
  where id = p_receipt_id
    and processing_status = 'processing'
    and attempt_count = p_attempt_count
  returning id
  into v_updated_id;

  return v_updated_id is not null;
end;
$$;
