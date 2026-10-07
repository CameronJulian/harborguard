-- Register i-TRAFFIC as a dormant external-intelligence source.
--
-- i-TRAFFIC is a SANRAL traveller-information service.
--
-- Deliberately dormant:
-- - enabled = false
-- - approved_for_ingestion = false
--
-- Registration does NOT grant HSPP trust or operational authority.
--
-- Activation requires a separate controlled change after:
-- - a genuine developer/API key is obtained;
-- - API-specific usage rights are confirmed;
-- - commercial/redistribution permission is confirmed where required;
-- - Western Cape coverage and freshness are validated from genuine responses;
-- - provider observations are captured successfully;
-- - HSPP evidence integration is explicitly implemented and tested.
--
-- Public API documentation currently describes:
-- - events/incidents;
-- - roadway names;
-- - cameras;
-- - traffic alerts;
-- - variable-message signs;
-- - developer-key authentication;
-- - throttling of 10 calls per 60 seconds.
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
  'SANRAL i-TRAFFIC',
  'official',
  'live',
  false,
  false,
  50,
  'South Africa - SANRAL FMS coverage regions',
  null,
  true,
  'unconfirmed',
  'non_personal',
  '{
    "operator": "SANRAL",
    "capabilities": [
      "traffic_events",
      "roadworks",
      "closures",
      "roadways",
      "traffic_alerts",
      "cameras",
      "variable_message_signs"
    ],
    "authentication": "developer_key_required",
    "documented_rate_limit": {
      "requests": 10,
      "window_seconds": 60
    },
    "activation_state": "dormant",
    "integration_state": "registered_only",
    "provider_adapter_implemented": false,
    "hspp_provider_policy_registered": false,
    "coverage_verified": false,
    "freshness_verified": false,
    "api_access_verified": false,
    "terms_verified": false,
    "commercial_permission_verified": false
  }'::jsonb
)
on conflict (source_key) do nothing;
