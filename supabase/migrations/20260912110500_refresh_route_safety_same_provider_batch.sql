-- HarborGuard Route Safety same-provider refresh batch persistence.
--
-- Replaces many same-provider client/database update round trips with one
-- organization-scoped PostgreSQL transaction while preserving the existing
-- serialized same-target state transition semantics.
--
-- This function:
-- - validates the entire batch before mutation;
-- - locks distinct alert identities in deterministic order;
-- - applies refreshes in original inputIndex order;
-- - preserves existing non-empty road_name values;
-- - preserves the greatest valid expires_at value;
-- - records one provider_last_seen timestamp per applied refresh;
-- - keeps same-provider provider_sources to the requested source only;
-- - keeps provider_confirmation_count = 1;
-- - keeps provider_confidence equal to the validated base confidence;
-- - fails closed so any invalid or missing target rolls back the full batch.
--
-- This function does not perform provider matching, cross-provider merging,
-- new alert insertion, HSPP assessment, or downstream authority decisions.

create or replace function
public.refresh_route_safety_same_provider_batch(
  p_organization_id uuid,
  p_source text,
  p_base_confidence numeric,
  p_refreshes jsonb
)
returns table (
  input_index integer,
  alert_id uuid,
  provider_sources text[],
  provider_last_seen jsonb,
  provider_confirmation_count integer,
  provider_confidence integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;

  v_expected_count integer;
  v_returned_count integer := 0;

  v_input_index integer;
  v_alert_id uuid;

  v_incoming_expires_at timestamptz;
  v_incoming_road_name text;

  v_confirmed_at timestamptz;

  v_lock_alert_id uuid;

  v_current public.route_safety_alerts%rowtype;
  v_updated public.route_safety_alerts%rowtype;

  v_refreshed_expires_at timestamptz;
  v_refreshed_road_name text;

  v_base_confidence integer;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  p_source :=
    trim(
      coalesce(
        p_source,
        ''
      )
    );

  if p_source = '' then
    raise exception
      'p_source is required';
  end if;

  if
    p_base_confidence is null
    or p_base_confidence < 0
    or p_base_confidence > 100
  then
    raise exception
      'p_base_confidence must be between 0 and 100';
  end if;

  v_base_confidence :=
    p_base_confidence::integer;

  if
    p_refreshes is null
    or jsonb_typeof(p_refreshes) <> 'array'
  then
    raise exception
      'p_refreshes must be a JSON array';
  end if;

  v_expected_count :=
    jsonb_array_length(p_refreshes);

  if v_expected_count = 0 then
    return;
  end if;

  -- Validate the complete batch before any mutation.
  for v_item in
    select
      item.value
    from
      jsonb_array_elements(p_refreshes)
        as item(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception
        'Every same-provider refresh must be a JSON object';
    end if;

    begin
      v_input_index :=
        (
          v_item ->> 'inputIndex'
        )::integer;
    exception
      when invalid_text_representation then
        raise exception
          'Every same-provider refresh inputIndex must be an integer';
    end;

    if v_input_index is null or v_input_index < 0 then
      raise exception
        'Every same-provider refresh requires a non-negative inputIndex';
    end if;

    begin
      v_alert_id :=
        (
          v_item ->> 'alertId'
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Every same-provider refresh alertId must be a UUID';
    end;

    if v_alert_id is null then
      raise exception
        'Every same-provider refresh requires alertId';
    end if;

    if
      v_item ? 'expiresAt'
      and v_item -> 'expiresAt' <> 'null'::jsonb
      and nullif(
        trim(
          coalesce(
            v_item ->> 'expiresAt',
            ''
          )
        ),
        ''
      ) is not null
    then
      begin
        perform
          (
            v_item ->> 'expiresAt'
          )::timestamptz;
      exception
        when invalid_datetime_format then
          raise exception
            'Every same-provider refresh expiresAt must be a valid timestamp or null';
      end;
    end if;

    if
      v_item ? 'roadName'
      and v_item -> 'roadName' <> 'null'::jsonb
      and jsonb_typeof(
        v_item -> 'roadName'
      ) <> 'string'
    then
      raise exception
        'Every same-provider refresh roadName must be a string or null';
    end if;
  end loop;

  -- inputIndex must identify exactly one requested refresh.
  if (
    select count(distinct (item.value ->> 'inputIndex')::integer)
    from jsonb_array_elements(p_refreshes) as item(value)
  ) <> v_expected_count
  then
    raise exception
      'Same-provider refresh batch contains duplicate inputIndex values';
  end if;

  -- Lock distinct target identities in deterministic order.
  for v_lock_alert_id in
    select distinct
      (
        item.value ->> 'alertId'
      )::uuid
    from
      jsonb_array_elements(p_refreshes)
        as item(value)
    order by
      1
  loop
    perform
      pg_advisory_xact_lock(
        hashtextextended(
          'harborguard:route-safety-same-provider:' ||
          p_organization_id::text ||
          ':' ||
          v_lock_alert_id::text,
          0
        )
      );
  end loop;

  -- Apply refreshes in original input order.
  for v_item in
    select
      item.value
    from
      jsonb_array_elements(p_refreshes)
        as item(value)
    order by
      (
        item.value ->> 'inputIndex'
      )::integer
  loop
    v_input_index :=
      (
        v_item ->> 'inputIndex'
      )::integer;

    v_alert_id :=
      (
        v_item ->> 'alertId'
      )::uuid;

    if
      v_item ? 'expiresAt'
      and v_item -> 'expiresAt' <> 'null'::jsonb
      and nullif(
        trim(
          coalesce(
            v_item ->> 'expiresAt',
            ''
          )
        ),
        ''
      ) is not null
    then
      v_incoming_expires_at :=
        (
          v_item ->> 'expiresAt'
        )::timestamptz;
    else
      v_incoming_expires_at :=
        null;
    end if;

    if
      v_item ? 'roadName'
      and v_item -> 'roadName' <> 'null'::jsonb
    then
      v_incoming_road_name :=
        nullif(
          trim(
            v_item ->> 'roadName'
          ),
          ''
        );
    else
      v_incoming_road_name :=
        null;
    end if;

    select
      alert.*
    into
      v_current
    from
      public.route_safety_alerts
        as alert
    where
      alert.organization_id =
        p_organization_id
      and alert.id =
        v_alert_id
    for update;

    if not found then
      raise exception
        'Same-provider refresh target was not found in the requested organization';
    end if;

    if
      trim(
        coalesce(
          v_current.source,
          ''
        )
      ) <> p_source
    then
      raise exception
        'Same-provider refresh target source does not match p_source';
    end if;

    v_confirmed_at :=
      clock_timestamp();

    if
      v_current.expires_at is not null
      and v_incoming_expires_at is not null
    then
      v_refreshed_expires_at :=
        greatest(
          v_current.expires_at,
          v_incoming_expires_at
        );
    else
      v_refreshed_expires_at :=
        coalesce(
          v_current.expires_at,
          v_incoming_expires_at
        );
    end if;

    v_refreshed_road_name :=
      coalesce(
        nullif(
          trim(
            coalesce(
              v_current.road_name,
              ''
            )
          ),
          ''
        ),
        v_incoming_road_name
      );

    update
      public.route_safety_alerts as alert
    set
      provider_sources =
        array[p_source]::text[],

      provider_confirmation_count =
        1,

      provider_confidence =
        v_base_confidence,

      last_provider_confirmation_at =
        v_confirmed_at,

      provider_last_seen =
        coalesce(
          alert.provider_last_seen,
          '{}'::jsonb
        ) ||
        jsonb_build_object(
          p_source,
          v_confirmed_at
        ),

      verified_at =
        v_confirmed_at,

      verification_status =
        'verified',

      expires_at =
        v_refreshed_expires_at,

      road_name =
        v_refreshed_road_name

    where
      alert.organization_id =
        p_organization_id
      and alert.id =
        v_alert_id
      and trim(
        coalesce(
          alert.source,
          ''
        )
      ) =
        p_source

    returning
      alert.*
    into
      v_updated;

    if not found then
      raise exception
        'Same-provider refresh target changed before update';
    end if;

    v_returned_count :=
      v_returned_count + 1;

    return query
    select
      v_input_index,
      v_updated.id,
      v_updated.provider_sources,
      v_updated.provider_last_seen,
      v_updated.provider_confirmation_count,
      v_updated.provider_confidence;
  end loop;

  if v_returned_count <> v_expected_count then
    raise exception
      'Same-provider refresh batch returned row count did not match requested row count';
  end if;
end;
$$;

revoke all
on function
public.refresh_route_safety_same_provider_batch(
  uuid,
  text,
  numeric,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

grant execute
on function
public.refresh_route_safety_same_provider_batch(
  uuid,
  text,
  numeric,
  jsonb
)
to
  service_role;

comment on function
public.refresh_route_safety_same_provider_batch(
  uuid,
  text,
  numeric,
  jsonb
)
is
  'Atomic organization-scoped same-provider Route Safety refresh batch for trusted server-side ingestion. Validates the complete batch before mutation, locks distinct alert identities deterministically, applies refreshes in original inputIndex order, preserves existing road and expiry semantics, uses per-refresh execution timestamps, returns one canonical resolution row per input, and rolls back the complete batch on invalid or missing targets.';
