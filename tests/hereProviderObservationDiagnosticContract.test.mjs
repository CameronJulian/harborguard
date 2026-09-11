import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../lib/route-safety/providers/importHereIncidents.ts",
    import.meta.url
  ),
  "utf8"
);

test("HERE exposes low-sensitivity normalization diagnostics", () => {
  assert.match(
    source,
    /\[HERE provider diagnostic\]/
  );

  assert.match(
    source,
    /stage:\s*"normalized"/
  );

  assert.match(
    source,
    /httpStatus:\s*response\.status/
  );

  assert.match(
    source,
    /rawCount:\s*incidents\.length/
  );

  assert.match(
    source,
    /normalizedCount:\s*normalizedIncidents\.length/
  );

  assert.match(
    source,
    /uniqueProviderIds:\s*providerIdCounts\.size/
  );

  assert.match(
    source,
    /duplicateProviderIdGroups/
  );

  assert.match(
    source,
    /completeObservationIdentityCount/
  );
});

test("HERE reports only positional observation failure metadata", () => {
  assert.match(
    source,
    /stage:\s*"provider-observation-error"/
  );

  assert.match(
    source,
    /inputIndex/
  );

  assert.match(
    source,
    /persistedBeforeFailure/
  );

  assert.match(
    source,
    /hasProviderMessageId/
  );

  assert.match(
    source,
    /hasObservedAt/
  );
});

test("HERE diagnostic does not log provider identity values", () => {
  const diagnosticBlock =
    source.slice(
      source.indexOf(
        'stage:\n              "provider-observation-error"'
      ),
      source.indexOf(
        "throw error;",
        source.indexOf(
          'stage:\n              "provider-observation-error"'
        )
      )
    );

  assert.doesNotMatch(
    diagnosticBlock,
    /providerMessageId\s*:/
  );

  assert.doesNotMatch(
    diagnosticBlock,
    /observedAt\s*:/
  );

  assert.doesNotMatch(
    diagnosticBlock,
    /organizationId\s*:/
  );

  assert.doesNotMatch(
    diagnosticBlock,
    /normalizedPayload\s*:/
  );
});

test("HERE diagnostic preserves the original persistence error", () => {
  assert.match(
    source,
    /catch\s*\(error\)[\s\S]*throw error;/
  );
});

test("HERE provider observation identity remains unchanged", () => {
  assert.match(
    source,
    /providerMessageId:\s*normalized\.providerMessageId/
  );

  assert.match(
    source,
    /observedAt:\s*normalized\.observedAt/
  );

  assert.match(
    source,
    /payloadSchemaVersion:\s*HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2/
  );
});

test("diagnostic introduces no persistence concurrency", () => {
  assert.doesNotMatch(
    source,
    /Promise\.all\s*\(/
  );

  assert.doesNotMatch(
    source,
    /Promise\.allSettled\s*\(/
  );
});