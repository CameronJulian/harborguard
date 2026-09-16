-- HarborGuard PayFast subscription cancellation state transition.
--
-- Scope:
-- - mark an organization subscription as cancelled;
-- - preserve already-paid access through next_billing_date;
-- - set cancelled_at once;
-- - persist one idempotent billing event;
-- - do not create an invoice.

create unique index if not exists
billing_events_payfast_subscription_cancelled_unique
on public.billing_events (
    organization_id,
    provider,
    event_type
)
where
    provider = 'payfast'
    and event_type = 'subscription_cancelled';

create or replace function
public.record_payfast_subscription_cancellation_atomically(
    p_organization_id uuid,
    p_payload jsonb default '{}'::jsonb,
    p_raw_payload text default null
)
returns table (
    processed boolean,
    duplicate boolean,
    next_billing_date timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_event_id uuid;
    v_next_billing_date timestamptz;
begin
    if p_organization_id is null then
        raise exception
            'p_organization_id is required';
    end if;

    select
        o.next_billing_date
    into
        v_next_billing_date
    from public.organizations o
    where o.id = p_organization_id
    for update;

    if not found then
        raise exception
            'organization not found';
    end if;

    update public.organizations
    set
        subscription_status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now())
    where id = p_organization_id;

    insert into public.billing_events (
        organization_id,
        event_type,
        provider,
        payload,
        raw_payload
    )
    values (
        p_organization_id,
        'subscription_cancelled',
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
            true,
            v_next_billing_date;

        return;
    end if;

    return query
    select
        true,
        false,
        v_next_billing_date;
end;
$$;

revoke all
on function
public.record_payfast_subscription_cancellation_atomically(
    uuid,
    jsonb,
    text
)
from public;

revoke all
on function
public.record_payfast_subscription_cancellation_atomically(
    uuid,
    jsonb,
    text
)
from anon;

revoke all
on function
public.record_payfast_subscription_cancellation_atomically(
    uuid,
    jsonb,
    text
)
from authenticated;

grant execute
on function
public.record_payfast_subscription_cancellation_atomically(
    uuid,
    jsonb,
    text
)
to service_role;

comment on function
public.record_payfast_subscription_cancellation_atomically(
    uuid,
    jsonb,
    text
)
is
'Atomically marks a PayFast-backed HarborGuard subscription cancelled while preserving next_billing_date for cancel-at-period-end entitlement and records one idempotent cancellation event.';