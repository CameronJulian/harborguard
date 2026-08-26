-- Register Azure Maps Traffic as a dormant external-intelligence source.
--
-- Deliberately dormant:
-- - enabled = false
-- - approved_for_ingestion = false
--
-- Activation requires a separate controlled change after:
-- - Azure Maps credentials are configured;
-- - commercial/terms approval is confirmed;
-- - local provider verification succeeds.
--
-- This migration does not modify provider constraints,
-- HSPP lifecycle state, evidence assemblies, or cron wiring.

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
  'azure_maps_traffic',
  'Azure Maps Traffic',
  'commercial',
  'live',
  false,
  false,
  70,
  'South Africa',
  5,
  true,
  'unconfirmed',
  'non_personal',
  '{
    "capabilities": [
      "incidents",
      "closures",
      "hazards"
    ],
    "api_version": "2025-01-01",
    "activation_state": "dormant"
  }'::jsonb
)
on conflict (source_key) do nothing;
