import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importHereIncidents.ts",
    "utf8"
  );

test(
  "HERE logs structured HSPP evidence persistence failures",
  () => {
    assert.match(
      source,
      /stage:\s*[\r\n\s]*"hspp-evidence-persistence-error"/
    );

    assert.match(
      source,
      /providerObservationId:\s*[\r\n\s]*providerObservation\.id/
    );

    assert.match(
      source,
      /hadPrefetchedEvidence:\s*[\r\n\s]*Boolean\(prefetchedExistingEvidence\)/
    );

    assert.match(
      source,
      /errorCode:/
    );

    assert.match(
      source,
      /errorMessage:/
    );

    assert.match(
      source,
      /errorDetails:/
    );

    assert.match(
      source,
      /errorHint:/
    );
  }
);

test(
  "HERE evidence diagnostic preserves failure semantics",
  () => {
    assert.match(
      source,
      /throw error;/
    );

    assert.match(
      source,
      /Existing HSPP evidence does not match the provider observation evidence being persisted\./
    );

    assert.match(
      source,
      /await persistHsppEvidenceForProviderObservation\(\{/
    );
  }
);
