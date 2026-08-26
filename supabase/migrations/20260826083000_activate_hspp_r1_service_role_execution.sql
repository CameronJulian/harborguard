-- HSPP R1 service-role activation boundary.
--
-- This migration activates only the three R1 RPC authorities required by
-- the dormant post-positive Lifecycle V3 orchestration.
--
-- PUBLIC, anon, and authenticated remain explicitly denied.
-- Lifecycle V3 application routing is intentionally NOT changed here.

revoke execute on function
  public.persist_hspp_member_revalidation_checkpoint_under_lease(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    timestamp with time zone,
    timestamp with time zone
  )
from
  public,
  anon,
  authenticated;

grant execute on function
  public.persist_hspp_member_revalidation_checkpoint_under_lease(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    timestamp with time zone,
    timestamp with time zone
  )
to
  service_role;


revoke execute on function
  public.compare_and_swap_hspp_revalidation_candidate_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
from
  public,
  anon,
  authenticated;

grant execute on function
  public.compare_and_swap_hspp_revalidation_candidate_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
to
  service_role;


revoke execute on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
from
  public,
  anon,
  authenticated;

grant execute on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
to
  service_role;
