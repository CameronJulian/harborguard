import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const assessment =
  fs.readFileSync(
    "lib/hspp/assessHsppExternalIntelligenceEvidence.ts",
    "utf8",
  );

const persistence =
  fs.readFileSync(
    "lib/hspp/persistRouteSafetyProviderObservation.ts",
    "utf8",
  );

const here =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8",
  );

const tomtom =
  fs.readFileSync(
    "lib/route-safety/providers/importTomTomIncidents.ts",
    "utf8",
  );

const azure =
  fs.readFileSync(
    "lib/route-safety/providers/importAzureMapsIncidents.ts",
    "utf8",
  );

const migration =
  fs.readFileSync(
    "supabase/migrations/20260827175500_version_provider_payload_identity.sql",
    "utf8",
  );

test(
  "provider and HSPP source identities are normalization-schema aware",
  () => {
    assert.match(
      migration,
      /route_safety_provider_observations_source_identity_unique[\s\S]*unique\s*\([\s\S]*provider_message_id,[\s\S]*payload_schema_version[\s\S]*\)/i,
    );

    assert.match(
      migration,
      /hspp_evidence_source_identity_unique[\s\S]*unique\s*\([\s\S]*source_message_id,[\s\S]*payload_schema_version[\s\S]*\)/i,
    );
  },
);

test(
  "provider duplicate recovery is scoped to payload schema version",
  () => {
    assert.match(
      persistence,
      /\.eq\(\s*"provider_message_id",\s*normalizedProviderMessageId\s*\)[\s\S]*\.eq\(\s*"payload_schema_version",\s*normalizedPayloadSchemaVersion\s*\)[\s\S]*\.maybeSingle\(\)/,
    );
  },
);

test(
  "HERE v2 removes HarborGuard verification time but preserves provider expiry",
  () => {
    assert.match(
      here,
      /HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2/,
    );

    assert.match(
      here,
      /delete immutableNormalizedPayload\.verified_at/,
    );

    assert.doesNotMatch(
      here,
      /delete immutableNormalizedPayload\.expires_at/,
    );

    assert.match(
      here,
      /normalizedPayload:\s*immutableNormalizedPayload/,
    );
  },
);

test(
  "TomTom v2 removes HarborGuard verification and synthetic expiry times",
  () => {
    assert.match(
      tomtom,
      /HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2/,
    );

    assert.match(
      tomtom,
      /delete immutableNormalizedPayload\.verified_at/,
    );

    assert.match(
      tomtom,
      /delete immutableNormalizedPayload\.expires_at/,
    );

    assert.match(
      tomtom,
      /normalizedPayload:\s*immutableNormalizedPayload/,
    );
  },
);

test(
  "assessment supports provider-scoped v2 while Azure importer stays v1",
  () => {
    assert.match(
      assessment,
      /normalized-route-safety-alert-v2/,
    );

    assert.match(
      assessment,
      /input\.sourceProvider === "here"/,
    );

    assert.match(
      assessment,
      /input\.sourceProvider === "tomtom"/,
    );

    assert.match(
      azure,
      /HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION/,
    );

    assert.doesNotMatch(
      azure,
      /HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2/,
    );
  },
);