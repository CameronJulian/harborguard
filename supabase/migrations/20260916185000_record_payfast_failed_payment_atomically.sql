-- HarborGuard PayFast failed-payment evidence persistence.
--
-- Scope:
-- - persist authenticated PayFast FAILED ITN evidence;
-- - persist parsed and original raw ITN payloads;
-- - make retries idempotent by PayFast payment identity;
-- - do NOT change organization plan or entitlement;
-- - do NOT create a paid invoice.

create unique index if not exists
billing_events_payfast_failed_payment_unique
on public.billing_events (
    organization_id,
    provider,
    event_type,
    ((payload ->> 'pf_payment_id'))
)
where
    provider = 'payfast'
    and event_type = 'payment_failed'
    and nullif(
        btrim(payload ->> 'pf_payment_id'),
        ''
    ) is not null;

create or replace function
public.record_payfast_failed_payment_atomically(
    p_organization_id uuid,
    p_payfast_payment_id text,
    p_payload jsonb,
    p_raw_payload text default null
)
returns table (
    processed boolean,
    duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_event_id uuid;
begin
    if p_organization_id is null then
        raise exception
            'p_organization_id is required';
    end if;

    if
        p_payfast_payment_id is null
        or btrim(p_payfast_payment_id) = ''
    then
        raise exception
            'p_payfast_payment_id is required';
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
        'payment_failed',
        'payfast',
        coalesce(p_payload, '{}'::jsonb),
        p_raw_payload
    )
    on conflict do nothing
    returning id
    into v_event_id;

    if v_event_id is null then
        return query
        select
            false,
            true;

        return;
    end if;

    return query
    select
        true,
        false;
end;
$$;

revoke all
on function
public.record_payfast_failed_payment_atomically(
    uuid,
    text,
    jsonb,
    text
)
from public;

revoke all
on function
public.record_payfast_failed_payment_atomically(
    uuid,
    text,
    jsonb,
    text
)
from anon;

revoke all
on function
public.record_payfast_failed_payment_atomically(
    uuid,
    text,
    jsonb,
    text
)
from authenticated;

grant execute
on function
public.record_payfast_failed_payment_atomically(
    uuid,
    text,
    jsonb,
    text
)
to service_role;

comment on function
public.record_payfast_failed_payment_atomically(
    uuid,
    text,
    jsonb,
    text
)
is
'Atomically persists one authenticated PayFast FAILED payment evidence event with parsed and raw ITN payloads. Duplicate PayFast payment identities return duplicate=true. This function does not mutate organization entitlement and does not create an invoice.';
