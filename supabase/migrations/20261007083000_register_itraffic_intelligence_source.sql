-- Register i-TRAFFIC as a dormant external-intelligence source.
--
-- Deliberately dormant:
-- - enabled = false
-- - approved_for_ingestion = false
--
-- Registration does NOT grant HSPP trust or operational authority.
--
-- Activation requires a separate controlled change after:
-- - a genuine machine-readable source is identified;
-- - access/credentials are confirmed where required;
-- - commercial and usage terms are verified;
-- - Cape Town coverage and freshness are validated;
-- - provider observations are captured successfully;
-- - HSPP evidence integration is explicitly implemented and tested.
--
-- This migration does not:
-- - implement an i-TRAFFIC provider adapter;
-- - modify HSPP provider policy;
-- - enable ingestion;
-- - modify Safe Navigation;
-- - modify Route Safety alert authority;
-- - modify cron/provider execution wiring.

insert into public.intelligence_sources (
  source_key,
  display_name,
  classification,
  data_mode,
  enabled,
  approved_for_ingestion,
  base_confidence,
  geographic_coverage,
  update_frequency_minutes,
  attribution_required,
  commercial_use_status,
  privacy_classification,
  metadata
)
values (
  'itraffic',
  'i-TRAFFIC',
  'commercial',
  'live',
  false,
  false,
  50,
  'Cape Town, South Africa',
  null,
  true,
  'unconfirmed',
  'non_personal',
  '{
    "capabilities": [
      "traffic_incidents",
      "closures",
      "hazards"
    ],
    "activation_state": "dormant",
    "integration_state": "registered_only",
    "provider_adapter_implemented": false,
    "hspp_provider_policy_registered": false,
    "coverage_verified": false,
    "freshness_verified": false,
    "terms_verified": false
  }'::jsonb
)
on conflict (source_key) do nothing;
