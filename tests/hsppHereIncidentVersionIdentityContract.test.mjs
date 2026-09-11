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
  "HERE uses incident version id as immutable provider message identity",
  () => {
    assert.match(
      source,
      /const providerOriginalId\s*=[\s\S]*details\?\.originalId/
    );

    assert.match(
      source,
      /const providerMessageId\s*=[\s\S]*details\?\.id[\s\S]*providerOriginalId/
    );

    const originalIdPosition =
      source.indexOf("const providerOriginalId");

    const messageIdPosition =
      source.indexOf("const providerMessageId");

    assert.ok(originalIdPosition >= 0);
    assert.ok(messageIdPosition > originalIdPosition);
  }
);

test(
  "HERE preserves original incident-chain identity as immutable provenance",
  () => {
    assert.match(
      source,
      /immutableNormalizedPayload\.here_original_id\s*=[\s\S]*normalized\.providerOriginalId/
    );

    assert.match(
      source,
      /immutableSnapshotPayload\.here_original_id\s*=[\s\S]*normalized\.providerOriginalId/
    );
  }
);

test(
  "HSPP source identity continues from persisted provider observation",
  () => {
    assert.match(
      source,
      /sourceMessageId:\s*[\r\n\s]*providerObservation\.providerMessageId/
    );
  }
);