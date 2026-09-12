-- HSPP HERE provider-observation batch persistence.
--
-- This function reduces HERE provider-observation miss persistence to one
-- client/database round trip while preserving immutable provider identity.
--
-- It does not:
-- - build HSPP evidence;
-- - calculate HSPP assessments;
-- - modify TomTom or Azure Maps ingestion;
-- - replace the generic single-row writer;
-- - grant downstream Route Safety, Crowd, training, or validation authority.

create or replace function
public.persist_route_safety_provider_observations_batch(
  p_organization_id uuid,
  p_provider text,
  p_source_stream text,
  p_payload_schema_version text,
  p_observations jsonb
)
returns table (
  id uuid,
  organization_id uuid,
  provider text,
  source_stream text,
  provider_message_id text,
  observed_at timestamptz,
  received_at timestamptz,
  payload_schema_version text,
  normalized_payload jsonb,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;

  v_expected_count integer;
  v_distinct_count integer;
  v_returned_count integer := 0;

  v_provider_message_id text;
  v_observed_at timestamptz;
  v_received_at timestamptz;
  v_normalized_payload jsonb;

  v_row public.route_safety_provider_observations%rowtype;
  v_created boolean;

  v_lock_identity text;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  p_provider :=
    trim(
      coalesce(
        p_provider,
        ''
      )
    );

  if p_provider = '' then
    raise exception
      'p_provider is required';
  end if;

  p_source_stream :=
    trim(
      coalesce(
        p_source_stream,
        ''
      )
    );

  if p_source_stream = '' then
    raise exception
      'p_source_stream is required';
  end if;

  p_payload_schema_version :=
    trim(
      coalesce(
        p_payload_schema_version,
        ''
      )
    );

  if p_payload_schema_version = '' then
    raise exception
      'p_payload_schema_version is required';
  end if;

  if
    p_observations is null
    or jsonb_typeof(p_observations) <> 'array'
  then
    raise exception
      'p_observations must be a JSON array';
  end if;

  v_expected_count :=
    jsonb_array_length(
      p_observations
    );

  if v_expected_count = 0 then
    return;
  end if;

  select
    count(
      distinct trim(
        item.value ->> 'providerMessageId'
      )
    )::integer
  into
    v_distinct_count
  from
    jsonb_array_elements(
      p_observations
    ) as item(value);

  if v_distinct_count <> v_expected_count then
    raise exception
      'Provider observation batch cannot contain duplicate provider message identities';
  end if;

  -- Validate the entire batch before mutation.
  for v_item in
    select
      value
    from
      jsonb_array_elements(
        p_observations
      )
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception
        'Every provider observation batch item must be a JSON object';
    end if;

    v_provider_message_id :=
      trim(
        coalesce(
          v_item ->> 'providerMessageId',
          ''
        )
      );

    if v_provider_message_id = '' then
      raise exception
        'Every provider observation batch item requires providerMessageId';
    end if;

    begin
      v_observed_at :=
        (
          v_item ->> 'observedAt'
        )::timestamptz;
    exception
      when invalid_datetime_format then
        raise exception
          'Every provider observation batch observedAt must be a valid timestamp';
    end;

    if v_observed_at is null then
      raise exception
        'Every provider observation batch item requires observedAt';
    end if;

    begin
      v_received_at :=
        (
          v_item ->> 'receivedAt'
        )::timestamptz;
    exception
      when invalid_datetime_format then
        raise exception
          'Every provider observation batch receivedAt must be a valid timestamp';
    end;

    if v_received_at is null then
      raise exception
        'Every provider observation batch item requires receivedAt';
    end if;

    v_normalized_payload :=
      v_item -> 'normalizedPayload';

    if
      v_normalized_payload is null
      or jsonb_typeof(
        v_normalized_payload
      ) <> 'object'
    then
      raise exception
        'Every provider observation batch normalizedPayload must be a JSON object';
    end if;
  end loop;

  -- Resolve identities in deterministic order.
  for v_item in
    select
      item.value
    from
      jsonb_array_elements(
        p_observations
      ) as item(value)
    order by
      item.value ->> 'providerMessageId'
  loop
    v_provider_message_id :=
      trim(
        v_item ->> 'providerMessageId'
      );

    v_lock_identity :=
      'harborguard:provider-observation:' ||
      p_organization_id::text ||
      ':' ||
      p_provider ||
      ':' ||
      p_source_stream ||
      ':' ||
      v_provider_message_id ||
      ':' ||
      p_payload_schema_version;

    perform
      pg_advisory_xact_lock(
        hashtextextended(
          v_lock_identity,
          0
        )
      );
  end loop;

  -- Persist/resolve each identity inside this one transaction.
  for v_item in
    select
      value
    from
      jsonb_array_elements(
        p_observations
      )
  loop
    v_provider_message_id :=
      trim(
        v_item ->> 'providerMessageId'
      );

    v_observed_at :=
      (
        v_item ->> 'observedAt'
      )::timestamptz;

    v_received_at :=
      (
        v_item ->> 'receivedAt'
      )::timestamptz;

    v_normalized_payload :=
      v_item -> 'normalizedPayload';

    v_created :=
      false;

    v_row :=
      null;

    insert into
      public.route_safety_provider_observations (
        organization_id,
        provider,
        source_stream,
        provider_message_id,
        observed_at,
        received_at,
        payload_schema_version,
        normalized_payload
      )
    values (
      p_organization_id,
      p_provider,
      p_source_stream,
      v_provider_message_id,
      v_observed_at,
      v_received_at,
      p_payload_schema_version,
      v_normalized_payload
    )
    on conflict on constraint
      route_safety_provider_observations_source_identity_unique
    do nothing
    returning
      route_safety_provider_observations.*
    into
      v_row;

    if found then
      v_created :=
        true;
    else
      select
        observation.*
      into
        v_row
      from
        public.route_safety_provider_observations
          as observation
      where
        observation.organization_id =
          p_organization_id
        and observation.provider =
          p_provider
        and observation.source_stream =
          p_source_stream
        and observation.provider_message_id =
          v_provider_message_id
        and observation.payload_schema_version =
          p_payload_schema_version
      for update;

      if not found then
        raise exception
          'Provider observation conflict was reported but canonical observation could not be resolved';
      end if;

      if
        v_row.observed_at <>
        v_observed_at
      then
        raise exception
          'Provider observation identity collision: observedAt does not match the existing immutable observation';
      end if;

      if
        v_row.normalized_payload <>
        v_normalized_payload
      then
        raise exception
          'Provider observation identity collision: normalized payload does not match the existing immutable observation';
      end if;
    end if;

    v_returned_count :=
      v_returned_count + 1;

    return query
    select
      v_row.id,
      v_row.organization_id,
      v_row.provider,
      v_row.source_stream,
      v_row.provider_message_id,
      v_row.observed_at,
      v_row.received_at,
      v_row.payload_schema_version,
      v_row.normalized_payload,
      v_created;
  end loop;

  if
    v_returned_count <>
    v_expected_count
  then
    raise exception
      'Provider observation batch returned row count did not match requested row count';
  end if;
end;
$$;

revoke all
on function
public.persist_route_safety_provider_observations_batch(
  uuid,
  text,
  text,
  text,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

grant execute
on function
public.persist_route_safety_provider_observations_batch(
  uuid,
  text,
  text,
  text,
  jsonb
)
to
  service_role;

comment on function
public.persist_route_safety_provider_observations_batch(
  uuid,
  text,
  text,
  text,
  jsonb
)
is
  'Atomic organization-scoped provider-observation batch persistence boundary for trusted server-side provider ingestion. Preserves immutable provider-native identity, validates existing canonical observations on conflict, uses deterministic transaction locks, and returns canonical observation identities. It does not build HSPP evidence or grant downstream authority.';