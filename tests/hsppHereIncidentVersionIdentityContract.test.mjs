import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../lib/route-safety/providers/importHereIncidents.ts",
    import.meta.url
  ),
  "utf8"
);

test(
  "HERE separates incident-chain identity from incident identity",
  () => {
    assert.match(
      source,
      /const providerOriginalId\s*=[\s\S]*details\?\.originalId/
    );

    assert.match(
      source,
      /const providerIncidentId\s*=[\s\S]*details\?\.id[\s\S]*providerOriginalId/
    );
  }
);

test(
  "HERE providerMessageId combines incident id and canonical observedAt",
  () => {
    assert.match(
      source,
      /const providerMessageId\s*=[\s\S]*providerIncidentId\s*&&\s*observedAt[\s\S]*`\$\{providerIncidentId\}@\$\{observedAt\}`/
    );
  }
);

test(
  "HERE immutable payload preserves original and incident identifiers",
  () => {
    assert.match(
      source,
      /immutableSnapshotPayload\.here_original_id\s*=[\s\S]*normalized\.providerOriginalId/
    );

    assert.match(
      source,
      /immutableSnapshotPayload\.here_incident_id\s*=[\s\S]*normalized\.providerIncidentId/
    );

    assert.match(
      source,
      /immutableNormalizedPayload\.here_original_id\s*=[\s\S]*normalized\.providerOriginalId/
    );

    assert.match(
      source,
      /immutableNormalizedPayload\.here_incident_id\s*=[\s\S]*normalized\.providerIncidentId/
    );
  }
);

test(
  "HSPP source identity remains persisted provider observation identity",
  () => {
    assert.match(
      source,
      /sourceMessageId:\s*[\r\n\s]*providerObservation\.providerMessageId/
    );
  }
);