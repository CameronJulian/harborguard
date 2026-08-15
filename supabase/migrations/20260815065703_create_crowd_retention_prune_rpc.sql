-- C-1D9: privacy-safe Crowd Intelligence retention primitive.
--
-- This migration defines an explicit service-role-only pruning boundary
-- for privacy-separated Crowd Intelligence data.
--
-- Retention-policy boundary:
--   - this function DOES NOT define a retention duration;
--   - callers must provide an explicit inclusive keep-boundary date;
--   - rows with observed_date strictly BEFORE p_cutoff_date are deleted;
--   - p_cutoff_date and newer data are retained.
--
-- Privacy boundary:
--   - returns aggregate deletion counts only;
--   - does not return trip tokens;
--   - does not return segment keys;
--   - does not return raw trip IDs;
--   - does not return vehicle IDs;
--   - does not return organization IDs;
--   - does not return user / driver IDs;
--   - does not return coordinates.
--
-- Integrity boundary:
--   - traversal source rows and their materialized exposure aggregates
--     are pruned within the same database transaction;
--   - pipeline receipts for the same expired observed-date range are
--     pruned in that transaction;
--   - the same advisory lock used by Crowd aggregation is acquired so
--     retention cannot race aggregate recomputation.
--
-- This primitive does not schedule itself and does not establish an
-- organization or legal retention policy.

create or replace function public.prune_crowd_intelligence_before(
  p_cutoff_date date
)
returns table (
  deleted_traversal_rows bigint,
  deleted_aggregate_rows bigint,
  deleted_receipt_rows bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_deleted_traversal_rows bigint := 0;
  v_deleted_aggregate_rows bigint := 0;
  v_deleted_receipt_rows bigint := 0;
begin
  if p_cutoff_date is null then
    raise exception
      'p_cutoff_date is required';
  end if;

  /*
   * Serialize retention against aggregate recomputation.
   *
   * aggregate_crowd_segment_exposure_stats() already uses this
   * advisory-lock identity, so pruning and aggregation cannot modify
   * the same Crowd evidence concurrently.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:crowd_segment_exposure_stats',
      0
    )
  );

  /*
   * Remove materialized buckets for the expired date range.
   *
   * Doing this in the same transaction as traversal pruning prevents
   * retained orphan aggregates after source evidence is removed.
   */
  delete from public.crowd_segment_exposure_stats
  where observed_date < p_cutoff_date;

  get diagnostics
    v_deleted_aggregate_rows = row_count;

  /*
   * Remove expired anonymous traversal evidence.
   */
  delete from public.crowd_segment_traversals
  where observed_date < p_cutoff_date;

  get diagnostics
    v_deleted_traversal_rows = row_count;

  /*
   * Remove expired anonymous processing receipts.
   */
  delete from public.crowd_journey_pipeline_receipts
  where observed_date < p_cutoff_date;

  get diagnostics
    v_deleted_receipt_rows = row_count;

  return query
  select
    v_deleted_traversal_rows,
    v_deleted_aggregate_rows,
    v_deleted_receipt_rows;
end;
$$;

revoke all
on function public.prune_crowd_intelligence_before(
  date
)
from public, anon, authenticated;

grant execute
on function public.prune_crowd_intelligence_before(
  date
)
to service_role;

comment on function
  public.prune_crowd_intelligence_before(
    date
  )
is
  'C-1D9 service-role-only privacy-safe Crowd Intelligence retention primitive. Atomically removes traversal evidence, materialized exposure aggregates and journey pipeline receipts whose observed_date is strictly before an explicit caller-supplied cutoff date. Returns aggregate deletion counts only. Does not define a retention duration, scheduling policy, statistical sufficiency rule or Route Safety production-scoring behavior.';