alter table public.billing_events
  add column if not exists raw_payload text;

create or replace function public.activate_payfast_subscription_atomically(
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
as $$
declare
  v_invoice_inserted boolean := false;
begin
  insert into public.invoices (
    organization_id,
    payfast_payment_id,
    amount,
    currency,
    status
  )
  values (
    p_organization_id,
    p_payfast_payment_id,
    p_amount,
    p_currency,
    'paid'
  )
  on conflict on constraint invoices_payfast_payment_id_unique
  do nothing;

  get diagnostics
    v_invoice_inserted = row_count;

  if not v_invoice_inserted then
    return query
      select false, true;

    return;
  end if;

  update public.organizations
  set
    subscription_status = 'active',
    plan = 'professional',
    payfast_subscription_id = p_payfast_subscription_id,
    next_billing_date = p_next_billing_date
  where id = p_organization_id;

  if not found then
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

grant all
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