import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../lib/hspp/persistRouteSafetyProviderObservation.ts",
    import.meta.url
  ),
  "utf8"
);

test("23505 diagnostic preserves duplicate-only recovery boundary", () => {
  assert.match(
    source,
    /if\s*\(error\.code\s*!==\s*"23505"\)/
  );

  assert.match(
    source,
    /throw error;/
  );
});

test("23505 diagnostic classifies duplicate constraint without printing database detail", () => {
  assert.match(
    source,
    /\[Provider observation 23505 diagnostic\]/
  );

  assert.match(
    source,
    /constraintClass:\s*duplicateConstraintClass/
  );

  assert.match(
    source,
    /"canonical_identity"/
  );

  assert.match(
    source,
    /"other_unique"/
  );

  assert.match(
    source,
    /"unknown"/
  );

  assert.doesNotMatch(
    source,
    /console\.(?:info|log|warn|error)\([^)]*error\.details/
  );

  assert.doesNotMatch(
    source,
    /console\.(?:info|log|warn|error)\([^)]*error\.message/
  );
});

test("duplicate lookup diagnostic exposes only comparison booleans", () => {
  assert.match(
    source,
    /existingRowFound:\s*true/
  );

  assert.match(
    source,
    /observedAtMatches/
  );

  assert.match(
    source,
    /payloadSchemaMatches/
  );

  assert.match(
    source,
    /normalizedPayloadMatches/
  );
});

test("diagnostic does not log raw observation identity or payload values", () => {
  const blocks =
    [...source.matchAll(
      /console\.info\(\s*"\[Provider observation 23505 diagnostic\]"[\s\S]*?\n\s*\);/g
    )]
      .map(
        (match) =>
          match[0]
      )
      .join("\n");

  assert.doesNotMatch(
    blocks,
    /organizationId\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /providerMessageId\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /observedAt\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /normalizedPayload\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /normalizedOrganizationId\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /normalizedProviderMessageId\s*:/
  );

  assert.doesNotMatch(
    blocks,
    /normalizedObservedAt\s*:/
  );
});

test("canonical five-part duplicate lookup remains unchanged", () => {
  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"provider",\s*normalizedProvider\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"source_stream",\s*normalizedSourceStream\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"provider_message_id",\s*normalizedProviderMessageId\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"payload_schema_version",\s*normalizedPayloadSchemaVersion\s*\)/
  );
});

test("immutable assertion remains authoritative after diagnostic", () => {
  const diagnosticIndex =
    source.indexOf(
      "[Provider observation 23505 diagnostic]"
    );

  assert.ok(
    diagnosticIndex >= 0
  );

  const assertionIndex =
    source.indexOf(
      "assertExistingObservationMatches(",
      diagnosticIndex
    );

  assert.ok(
    assertionIndex > diagnosticIndex
  );

  const postDiagnosticSource =
    source.slice(
      diagnosticIndex
    );

  assert.match(
    postDiagnosticSource,
    /assertExistingObservationMatches\(/
  );

  assert.match(
    postDiagnosticSource,
    /observedAt:\s*normalizedObservedAt/
  );

  assert.match(
    postDiagnosticSource,
    /payloadSchemaVersion:\s*normalizedPayloadSchemaVersion/
  );

  assert.match(
    postDiagnosticSource,
    /normalizedPayload:\s*validatedPayload/
  );
});