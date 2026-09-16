-- HarborGuard PayFast raw-ITN forensic persistence.
--
-- Replaces the existing seven-argument atomic activation RPC with an
-- eight-argument version that also persists the original bounded PayFast
-- form body. Existing validation, security, lifecycle and idempotency
-- semantics are intentionally preserved.

alter table public.billing_events
  add column if not exists raw_payload text;

drop function if exists public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb
);

create function public.activate_payfast_subscription_atomically(
  p_organization_id uuid,
  p_payfast_payment_id text,
  p_payfast_subscription_id text,
  p_next_billing_date timestamptz,
  p_amount numeric,
  p_currency text,
  p_payload jsonb,
  p_raw_payload text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_invoice_id uuid;
  v_updated_rows integer := 0;
begin
  if p_organization_id is null then
    raise exception
      'PayFast organization ID is required.'
      using errcode = '22023';
  end if;

  if p_payfast_payment_id is null
     or btrim(p_payfast_payment_id) = ''
  then
    raise exception
      'PayFast payment ID is required.'
      using errcode = '22023';
  end if;

  insert into public.invoices (
    organization_id,
    payfast_payment_id,
    amount,
    currency,
    status,
    invoice_url
  )
  values (
    p_organization_id,
    p_payfast_payment_id,
    coalesce(p_amount, 0),
    coalesce(nullif(btrim(p_currency), ''), 'ZAR'),
    'paid',
    null
  )
  on conflict on constraint invoices_payfast_payment_id_unique
  do nothing
  returning id
  into v_invoice_id;

  if v_invoice_id is null then
    return query
      select false, true;

    return;
  end if;

  update public.organizations
  set
    subscription_status = 'active',
    plan = 'professional',
    trial_ends_at = null,
    payfast_subscription_id = p_payfast_subscription_id,
    next_billing_date = p_next_billing_date
  where id = p_organization_id;

  get diagnostics
    v_updated_rows = row_count;

  if v_updated_rows <> 1 then
    raise exception
      'PayFast organization activation target was not found.'
      using errcode = 'P0002';
  end if;

  insert into public.billing_events (
    organization_id,
    event_type,
    provider,
    payload,
    raw_payload
  )
  values (
    p_organization_id,
    'subscription_activated',
    'payfast',
    coalesce(p_payload, '{}'::jsonb),
    p_raw_payload
  );

  return query
    select true, false;
end;
$$;

revoke all
on function public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb,
  text
)
from public;

revoke all
on function public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb,
  text
)
from anon;

revoke all
on function public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb,
  text
)
from authenticated;

grant execute
on function public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb,
  text
)
to service_role;

comment on function public.activate_payfast_subscription_atomically(
  uuid,
  text,
  text,
  timestamptz,
  numeric,
  text,
  jsonb,
  text
) is
  'Atomically claims a PayFast payment identity, activates the organization, records the activation event with parsed and original raw ITN payloads, and creates the paid invoice. Duplicate payment identities return duplicate=true without repeating lifecycle mutations.';