-- C-1D7: privacy-safe Crowd aggregation integrity monitoring.
--
-- Reconciles the authoritative anonymous traversal evidence with the
-- materialized exposure aggregate and returns descriptive counts only.
--
-- This function intentionally does NOT expose:
--   - trip tokens
--   - segment keys
--   - raw trip IDs
--   - vehicle IDs
--   - organization IDs
--   - user / driver IDs
--   - coordinates
--
-- It also does NOT define statistical sufficiency, reliability,
-- confidence, alerting thresholds, or Route Safety scoring eligibility.

create or replace function public.get_crowd_aggregation_integrity()
returns table (
  source_bucket_count bigint,
  aggregate_bucket_count bigint,
  missing_aggregate_bucket_count bigint,
  orphan_aggregate_bucket_count bigint,
  traversal_count_mismatch_count bigint,
  anonymous_journey_mismatch_count bigint,
  sample_count_mismatch_count bigint,
  integrity_ok boolean
)
language sql
security invoker
set search_path = public
as $$
  with source_buckets as (
    select
      traversals.segment_key,
      traversals.direction_bucket,
      traversals.hour_bucket,
      traversals.observed_date,

      count(*)::bigint
        as traversal_count,

      count(
        distinct traversals.trip_token
      )::bigint
        as anonymous_journey_count,

      sum(
        traversals.sample_count
      )::bigint
        as sample_count

    from public.crowd_segment_traversals
      as traversals

    group by
      traversals.segment_key,
      traversals.direction_bucket,
      traversals.hour_bucket,
      traversals.observed_date
  ),

  aggregate_buckets as (
    select
      aggregates.segment_key,
      aggregates.direction_bucket,
      aggregates.hour_bucket,
      aggregates.observed_date,
      aggregates.traversal_count,
      aggregates.anonymous_journey_count,
      aggregates.sample_count

    from public.crowd_segment_exposure_stats
      as aggregates
  ),

  reconciled as (
    select
      coalesce(
        source.segment_key,
        aggregate.segment_key
      ) as segment_key,

      coalesce(
        source.direction_bucket,
        aggregate.direction_bucket
      ) as direction_bucket,

      coalesce(
        source.hour_bucket,
        aggregate.hour_bucket
      ) as hour_bucket,

      coalesce(
        source.observed_date,
        aggregate.observed_date
      ) as observed_date,

      source.segment_key is not null
        as has_source,

      aggregate.segment_key is not null
        as has_aggregate,

      source.traversal_count
        as source_traversal_count,

      aggregate.traversal_count
        as aggregate_traversal_count,

      source.anonymous_journey_count
        as source_anonymous_journey_count,

      aggregate.anonymous_journey_count
        as aggregate_anonymous_journey_count,

      source.sample_count
        as source_sample_count,

      aggregate.sample_count
        as aggregate_sample_count

    from source_buckets as source

    full outer join aggregate_buckets
      as aggregate
      on aggregate.segment_key =
           source.segment_key
      and aggregate.direction_bucket =
           source.direction_bucket
      and aggregate.hour_bucket =
           source.hour_bucket
      and aggregate.observed_date =
           source.observed_date
  ),

  metrics as (
    select
      (
        select count(*)::bigint
        from source_buckets
      )
        as source_bucket_count,

      (
        select count(*)::bigint
        from aggregate_buckets
      )
        as aggregate_bucket_count,

      count(*) filter (
        where
          has_source = true
          and has_aggregate = false
      )::bigint
        as missing_aggregate_bucket_count,

      count(*) filter (
        where
          has_source = false
          and has_aggregate = true
      )::bigint
        as orphan_aggregate_bucket_count,

      count(*) filter (
        where
          has_source = true
          and has_aggregate = true
          and source_traversal_count
              is distinct from
              aggregate_traversal_count
      )::bigint
        as traversal_count_mismatch_count,

      count(*) filter (
        where
          has_source = true
          and has_aggregate = true
          and source_anonymous_journey_count
              is distinct from
              aggregate_anonymous_journey_count
      )::bigint
        as anonymous_journey_mismatch_count,

      count(*) filter (
        where
          has_source = true
          and has_aggregate = true
          and source_sample_count
              is distinct from
              aggregate_sample_count
      )::bigint
        as sample_count_mismatch_count

    from reconciled
  )

  select
    metrics.source_bucket_count,
    metrics.aggregate_bucket_count,
    metrics.missing_aggregate_bucket_count,
    metrics.orphan_aggregate_bucket_count,
    metrics.traversal_count_mismatch_count,
    metrics.anonymous_journey_mismatch_count,
    metrics.sample_count_mismatch_count,

    (
      metrics.source_bucket_count =
        metrics.aggregate_bucket_count

      and metrics.missing_aggregate_bucket_count = 0

      and metrics.orphan_aggregate_bucket_count = 0

      and metrics.traversal_count_mismatch_count = 0

      and metrics.anonymous_journey_mismatch_count = 0

      and metrics.sample_count_mismatch_count = 0
    )
      as integrity_ok

  from metrics;
$$;

revoke all
on function public.get_crowd_aggregation_integrity()
from public, anon, authenticated;

grant execute
on function public.get_crowd_aggregation_integrity()
to service_role;

comment on function
  public.get_crowd_aggregation_integrity()
is
  'C-1D7 privacy-safe reconciliation summary comparing anonymous Crowd traversal buckets with materialized exposure aggregates. Returns aggregate integrity counts only and exposes no trip token, segment identifier, vehicle, organization, user, driver, or coordinate data. Does not define evidence sufficiency, confidence, reliability, alerting thresholds, or Route Safety production-scoring eligibility.';