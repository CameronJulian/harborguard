import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(
  "lib/hspp/persistHsppEvidenceForProviderObservation.ts",
  "utf8"
);

const here = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test(
  "generic HSPP evidence prefetch reads by organization and provider observation ids",
  () => {
    assert.match(
      helper,
      /export async function prefetchHsppEvidenceForProviderObservations/
    );

    assert.match(
      helper,
      /\.from\(\s*"hspp_evidence"\s*\)/
    );

    assert.match(
      helper,
      /\.eq\(\s*"organization_id"/
    );

    assert.match(
      helper,
      /\.in\(\s*"provider_observation_id"/
    );
  }
);

test(
  "evidence prefetch returns immutable id and fingerprint",
  () => {
    assert.match(
      helper,
      /id:\s*row\.id/
    );

    assert.match(
      helper,
      /integrityFingerprint:\s*row\.integrity_fingerprint/
    );
  }
);

test(
  "evidence prefetch fails closed on duplicate provider observation identity",
  () => {
    assert.match(
      helper,
      /result\.has\(\s*row\.provider_observation_id/
    );

    assert.match(
      helper,
      /duplicate provider-observation identities/
    );
  }
);

test(
  "HERE performs one HSPP evidence prefetch before evidence persistence",
  () => {
    const prefetch =
      here.indexOf(
        "await prefetchHsppEvidenceForProviderObservations({"
      );

    const evidencePersistence =
      here.indexOf(
        "await persistHsppEvidenceForProviderObservation({"
      );

    assert.ok(prefetch >= 0);
    assert.ok(evidencePersistence > prefetch);

    const calls =
      here.match(
        /await prefetchHsppEvidenceForProviderObservations\s*\(/g
      ) ?? [];

    assert.equal(
      calls.length,
      1
    );
  }
);

test(
  "HERE prefetch is limited to already prefetched provider observations",
  () => {
    assert.match(
      here,
      /Array\.from\(\s*prefetchedProviderObservations\.values\(\)\s*\)/
    );

    assert.match(
      here,
      /\.map\(\s*\(observation\)\s*=>\s*observation\.id/
    );
  }
);

test(
  "HERE verifies evidence integrity fingerprint before reuse",
  () => {
    assert.match(
      here,
      /prefetchedExistingEvidence\.integrityFingerprint !==\s*evidence\.integrityFingerprint/
    );

    assert.match(
      here,
      /Existing HSPP evidence does not match the provider observation evidence being persisted/
    );
  }
);

test(
  "HERE retains the existing evidence persistence fallback",
  () => {
    assert.match(
      here,
      /await persistHsppEvidenceForProviderObservation\(\{/
    );

    assert.match(
      here,
      /providerObservationId:\s*providerObservation\.id/
    );
  }
);

test(
  "HERE evidence prefetch does not introduce Promise concurrency",
  () => {
    assert.doesNotMatch(
      here,
      /Promise\.all\s*\(/
    );

    assert.doesNotMatch(
      here,
      /Promise\.allSettled\s*\(/
    );
  }
);