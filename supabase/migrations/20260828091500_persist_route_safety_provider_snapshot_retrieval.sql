-- Atomically persist one provider snapshot retrieval and its complete
-- incident-presence assertion set.
--
-- This function preserves the three independent temporal/provenance axes:
--
--   snapshot/version
--     Provider-native dataset coordinate.
--
--   retrieval
--     One concrete HTTP response occurrence.
--
--   assertion
--     One incident asserted present in that retrieval, with optional
--     provider event/report time.
--
-- The complete retrieval is persisted in one PostgreSQL statement
-- transaction. A failure anywhere in this function rolls back the
-- snapshot/retrieval/assertion writes from this invocation.
--
-- A caller-generated p_retrieval_id identifies one concrete HTTP
-- retrieval occurrence and makes persistence retries deterministic.
--
-- Existing route_safety_provider_observations and HSPP evidence identity
-- are not changed by this function.

create or replace function
public.persist_route_safety_provider_snapshot_retrieval(
  p_organization_id uuid,
  p_provider text,
  p_source_stream text,
  p_snapshot_identity_kind text,
  p_snapshot_identity_value text,
  p_provider_source_updated_at timestamptz,
  p_retrieval_id uuid,
  p_response_originated_at timestamptz,
  p_received_at timestamptz,
  p_provider_request_id text,
  p_assertions jsonb
)
returns table (
  persisted_snapshot_id uuid,
  persisted_retrieval_id uuid,
  persisted_assertion_count integer
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_provider text;
  v_source_stream text;
  v_snapshot_identity_kind text;

  v_snapshot_id uuid;
  v_existing_snapshot_source_updated_at timestamptz;

  v_retrieval_created boolean := false;
  v_existing_retrieval_id uuid;
  v_existing_retrieval_snapshot_id uuid;
  v_existing_response_originated_at timestamptz;
  v_existing_received_at timestamptz;
  v_existing_provider_request_id text;

  v_assertion jsonb;
  v_provider_message_id text;
  v_payload_schema_version text;
  v_event_observed_at timestamptz;
  v_provider_observation_id uuid;
  v_normalized_payload jsonb;

  v_existing_provider_observation_id uuid;
  v_existing_provider_observed_at timestamptz;
  v_existing_provider_payload_schema_version text;
  v_existing_provider_normalized_payload jsonb;

  v_existing_assertion_id uuid;
  v_existing_assertion_event_observed_at timestamptz;
  v_existing_assertion_provider_observation_id uuid;
  v_existing_assertion_payload jsonb;

  v_expected_assertion_count integer := 0;
  v_actual_assertion_count integer := 0;
begin
  if p_organization_id is null then
    raise exception
      'organization_id is required'
      using errcode = '22023';
  end if;

  v_provider :=
    nullif(
      btrim(p_provider),
      ''
    );

  if v_provider is null then
    raise exception
      'provider is required'
      using errcode = '22023';
  end if;

  v_source_stream :=
    nullif(
      btrim(p_source_stream),
      ''
    );

  if v_source_stream is null then
    raise exception
      'source_stream is required'
      using errcode = '22023';
  end if;

  v_snapshot_identity_kind :=
    nullif(
      btrim(p_snapshot_identity_kind),
      ''
    );

  if v_snapshot_identity_kind is null then
    raise exception
      'snapshot_identity_kind is required'
      using errcode = '22023';
  end if;

  if
    p_snapshot_identity_value is null
    or length(
      btrim(
        p_snapshot_identity_value
      )
    ) = 0
  then
    raise exception
      'snapshot_identity_value is required'
      using errcode = '22023';
  end if;

  if p_retrieval_id is null then
    raise exception
      'retrieval_id is required'
      using errcode = '22023';
  end if;

  if p_received_at is null then
    raise exception
      'received_at is required'
      using errcode = '22023';
  end if;

  if
    p_provider_request_id is not null
    and length(
      btrim(
        p_provider_request_id
      )
    ) = 0
  then
    raise exception
      'provider_request_id cannot be blank'
      using errcode = '22023';
  end if;

  if
    p_assertions is null
    or jsonb_typeof(
      p_assertions
    ) <> 'array'
  then
    raise exception
      'assertions must be a JSON array'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Snapshot/version
  -- ==========================================================

  insert into
    public.route_safety_provider_snapshots (
      organization_id,
      provider,
      source_stream,
      snapshot_identity_kind,
      snapshot_identity_value,
      provider_source_updated_at
    )
  values (
    p_organization_id,
    v_provider,
    v_source_stream,
    v_snapshot_identity_kind,
    p_snapshot_identity_value,
    p_provider_source_updated_at
  )
  on conflict (
    organization_id,
    provider,
    source_stream,
    snapshot_identity_kind,
    snapshot_identity_value
  )
  do nothing
  returning id
  into v_snapshot_id;


  if v_snapshot_id is null then
    select
      snapshot.id,
      snapshot.provider_source_updated_at
    into
      v_snapshot_id,
      v_existing_snapshot_source_updated_at
    from
      public.route_safety_provider_snapshots
        as snapshot
    where
      snapshot.organization_id =
        p_organization_id
      and snapshot.provider =
        v_provider
      and snapshot.source_stream =
        v_source_stream
      and snapshot.snapshot_identity_kind =
        v_snapshot_identity_kind
      and snapshot.snapshot_identity_value =
        p_snapshot_identity_value;

    if v_snapshot_id is null then
      raise exception
        'Provider snapshot identity conflict could not be resolved.'
        using errcode = '23505';
    end if;

    if
      v_existing_snapshot_source_updated_at
      is distinct from
      p_provider_source_updated_at
    then
      raise exception
        'Provider snapshot identity collision: provider_source_updated_at does not match the immutable snapshot.'
        using errcode = '23505';
    end if;
  end if;


  -- ==========================================================
  -- Retrieval occurrence
  -- ==========================================================

  insert into
    public.route_safety_provider_snapshot_retrievals (
      id,
      snapshot_id,
      response_originated_at,
      received_at,
      provider_request_id
    )
  values (
    p_retrieval_id,
    v_snapshot_id,
    p_response_originated_at,
    p_received_at,
    p_provider_request_id
  )
  on conflict (id)
  do nothing
  returning id
  into v_existing_retrieval_id;


  if v_existing_retrieval_id is not null then
    v_retrieval_created := true;
  else
    select
      retrieval.id,
      retrieval.snapshot_id,
      retrieval.response_originated_at,
      retrieval.received_at,
      retrieval.provider_request_id
    into
      v_existing_retrieval_id,
      v_existing_retrieval_snapshot_id,
      v_existing_response_originated_at,
      v_existing_received_at,
      v_existing_provider_request_id
    from
      public.route_safety_provider_snapshot_retrievals
        as retrieval
    where
      retrieval.id =
        p_retrieval_id;

    if v_existing_retrieval_id is null then
      raise exception
        'Provider snapshot retrieval identity conflict could not be resolved.'
        using errcode = '23505';
    end if;

    if
      v_existing_retrieval_snapshot_id
      is distinct from
      v_snapshot_id
    then
      raise exception
        'Provider snapshot retrieval identity collision: snapshot_id does not match.'
        using errcode = '23505';
    end if;

    if
      v_existing_response_originated_at
      is distinct from
      p_response_originated_at
    then
      raise exception
        'Provider snapshot retrieval identity collision: response_originated_at does not match.'
        using errcode = '23505';
    end if;

    if
      v_existing_received_at
      is distinct from
      p_received_at
    then
      raise exception
        'Provider snapshot retrieval identity collision: received_at does not match.'
        using errcode = '23505';
    end if;

    if
      v_existing_provider_request_id
      is distinct from
      p_provider_request_id
    then
      raise exception
        'Provider snapshot retrieval identity collision: provider_request_id does not match.'
        using errcode = '23505';
    end if;
  end if;


  -- ==========================================================
  -- Complete assertion set
  -- ==========================================================

  for v_assertion in
    select item.value
    from jsonb_array_elements(
      p_assertions
    ) as item(value)
  loop
    if
      jsonb_typeof(
        v_assertion
      ) <> 'object'
    then
      raise exception
        'Each provider snapshot assertion must be a JSON object.'
        using errcode = '22023';
    end if;


    v_provider_message_id :=
      nullif(
        btrim(
          v_assertion
            ->> 'providerMessageId'
        ),
        ''
      );

    if v_provider_message_id is null then
      raise exception
        'Assertion providerMessageId is required.'
        using errcode = '22023';
    end if;


    v_payload_schema_version :=
      nullif(
        btrim(
          v_assertion
            ->> 'payloadSchemaVersion'
        ),
        ''
      );

    if v_payload_schema_version is null then
      raise exception
        'Assertion payloadSchemaVersion is required.'
        using errcode = '22023';
    end if;


    if
      not (
        v_assertion
        ? 'normalizedPayload'
      )
      or jsonb_typeof(
        v_assertion
          -> 'normalizedPayload'
      ) <> 'object'
    then
      raise exception
        'Assertion normalizedPayload must be a JSON object.'
        using errcode = '22023';
    end if;

    v_normalized_payload :=
      v_assertion
        -> 'normalizedPayload';


    v_event_observed_at := null;

    if
      v_assertion
        ->> 'eventObservedAt'
      is not null
    then
      if
        length(
          btrim(
            v_assertion
              ->> 'eventObservedAt'
          )
        ) = 0
      then
        raise exception
          'Assertion eventObservedAt cannot be blank.'
          using errcode = '22023';
      end if;

      begin
        v_event_observed_at :=
          (
            v_assertion
              ->> 'eventObservedAt'
          )::timestamptz;
      exception
        when others then
          raise exception
            'Assertion eventObservedAt must be a valid timestamp.'
            using errcode = '22023';
      end;
    end if;


    v_provider_observation_id := null;

    if
      v_assertion
        ->> 'providerObservationId'
      is not null
    then
      if
        length(
          btrim(
            v_assertion
              ->> 'providerObservationId'
          )
        ) = 0
      then
        raise exception
          'Assertion providerObservationId cannot be blank.'
          using errcode = '22023';
      end if;

      begin
        v_provider_observation_id :=
          (
            v_assertion
              ->> 'providerObservationId'
          )::uuid;
      exception
        when others then
          raise exception
            'Assertion providerObservationId must be a valid UUID.'
            using errcode = '22023';
      end;
    end if;


    -- When an assertion links to the pre-existing event-time
    -- provider observation, prove that the link describes the
    -- same immutable incident payload and event timestamp.
    if v_provider_observation_id is not null then
      v_existing_provider_observation_id :=
        null;

      select
        observation.id,
        observation.observed_at,
        observation.payload_schema_version,
        observation.normalized_payload
      into
        v_existing_provider_observation_id,
        v_existing_provider_observed_at,
        v_existing_provider_payload_schema_version,
        v_existing_provider_normalized_payload
      from
        public.route_safety_provider_observations
          as observation
      where
        observation.id =
          v_provider_observation_id
        and observation.organization_id =
          p_organization_id
        and observation.provider =
          v_provider
        and observation.source_stream =
          v_source_stream
        and observation.provider_message_id =
          v_provider_message_id;

      if
        v_existing_provider_observation_id
        is null
      then
        raise exception
          'Assertion providerObservationId does not identify the matching immutable provider observation.'
          using errcode = '23503';
      end if;

      if v_event_observed_at is null then
        raise exception
          'Assertion linked to a provider observation must preserve its eventObservedAt.'
          using errcode = '22023';
      end if;

      if
        v_existing_provider_observed_at
        is distinct from
        v_event_observed_at
      then
        raise exception
          'Assertion provider observation link collision: eventObservedAt does not match.'
          using errcode = '23505';
      end if;

      if
        v_existing_provider_payload_schema_version
        is distinct from
        v_payload_schema_version
      then
        raise exception
          'Assertion provider observation link collision: payloadSchemaVersion does not match.'
          using errcode = '23505';
      end if;

      if
        v_existing_provider_normalized_payload
        is distinct from
        v_normalized_payload
      then
        raise exception
          'Assertion provider observation link collision: normalizedPayload does not match.'
          using errcode = '23505';
      end if;
    end if;


    v_existing_assertion_id :=
      null;


    if v_retrieval_created then
      insert into
        public.route_safety_provider_snapshot_assertions (
          retrieval_id,
          provider_message_id,
          payload_schema_version,
          event_observed_at,
          provider_observation_id,
          normalized_payload
        )
      values (
        p_retrieval_id,
        v_provider_message_id,
        v_payload_schema_version,
        v_event_observed_at,
        v_provider_observation_id,
        v_normalized_payload
      )
      on conflict (
        retrieval_id,
        provider_message_id,
        payload_schema_version
      )
      do nothing
      returning id
      into v_existing_assertion_id;
    end if;


    if v_existing_assertion_id is null then
      select
        assertion.id,
        assertion.event_observed_at,
        assertion.provider_observation_id,
        assertion.normalized_payload
      into
        v_existing_assertion_id,
        v_existing_assertion_event_observed_at,
        v_existing_assertion_provider_observation_id,
        v_existing_assertion_payload
      from
        public.route_safety_provider_snapshot_assertions
          as assertion
      where
        assertion.retrieval_id =
          p_retrieval_id
        and assertion.provider_message_id =
          v_provider_message_id
        and assertion.payload_schema_version =
          v_payload_schema_version;


      if v_existing_assertion_id is null then
        if v_retrieval_created then
          raise exception
            'Provider snapshot assertion conflict could not be resolved.'
            using errcode = '23505';
        else
          raise exception
            'Existing provider snapshot retrieval assertion set does not match this retry.'
            using errcode = '23505';
        end if;
      end if;


      if
        v_existing_assertion_event_observed_at
        is distinct from
        v_event_observed_at
      then
        raise exception
          'Provider snapshot assertion identity collision: eventObservedAt does not match.'
          using errcode = '23505';
      end if;

      if
        v_existing_assertion_provider_observation_id
        is distinct from
        v_provider_observation_id
      then
        raise exception
          'Provider snapshot assertion identity collision: providerObservationId does not match.'
          using errcode = '23505';
      end if;

      if
        v_existing_assertion_payload
        is distinct from
        v_normalized_payload
      then
        raise exception
          'Provider snapshot assertion identity collision: normalizedPayload does not match.'
          using errcode = '23505';
      end if;
    end if;
  end loop;


  -- Freeze the complete assertion set for this retrieval.
  --
  -- For a deterministic retry, the exact unique assertion-key set
  -- must already exist. A retry cannot append a previously missing
  -- assertion to an immutable retrieval occurrence.

  select
    count(*)::integer
  into
    v_expected_assertion_count
  from (
    select
      btrim(
        item.value
          ->> 'providerMessageId'
      ) as provider_message_id,
      btrim(
        item.value
          ->> 'payloadSchemaVersion'
      ) as payload_schema_version
    from
      jsonb_array_elements(
        p_assertions
      ) as item(value)
    group by
      btrim(
        item.value
          ->> 'providerMessageId'
      ),
      btrim(
        item.value
          ->> 'payloadSchemaVersion'
      )
  ) as expected_assertions;


  select
    count(*)::integer
  into
    v_actual_assertion_count
  from
    public.route_safety_provider_snapshot_assertions
  where
    retrieval_id =
      p_retrieval_id;


  if
    v_actual_assertion_count
    is distinct from
    v_expected_assertion_count
  then
    raise exception
      'Existing provider snapshot retrieval assertion set cardinality does not match this retry.'
      using errcode = '23505';
  end if;


  return query
  select
    v_snapshot_id,
    p_retrieval_id,
    v_actual_assertion_count;
end;
$function$;


revoke all on function
public.persist_route_safety_provider_snapshot_retrieval(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
from public;


revoke all on function
public.persist_route_safety_provider_snapshot_retrieval(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
from anon;


revoke all on function
public.persist_route_safety_provider_snapshot_retrieval(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
from authenticated;


grant execute on function
public.persist_route_safety_provider_snapshot_retrieval(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
to service_role;


comment on function
public.persist_route_safety_provider_snapshot_retrieval(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
is
  'Atomically persists one immutable provider-native snapshot/version coordinate, one deterministic HTTP retrieval occurrence, and the retrieval''s complete immutable incident-presence assertion set. Existing provider-observation and HSPP evidence identity semantics are unchanged.';
