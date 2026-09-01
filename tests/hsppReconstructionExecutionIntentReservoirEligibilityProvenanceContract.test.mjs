import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const root =
  path.resolve(
    testDirectory,
    "..",
  );

const migrationPath =
  path.join(
    root,
    "supabase",
    "migrations",
    "20260901140000_add_hspp_reconstruction_intent_reservoir_eligibility_provenance.sql",
  );

const eligibilityPath =
  path.join(
    root,
    "lib",
    "hspp",
    "evaluateHsppReservoirEligibility.ts",
  );

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const eligibilitySource =
  fs.readFileSync(
    eligibilityPath,
    "utf8",
  );


test(
  "durable intent adds producer-neutral Reservoir eligibility policy provenance",
  () => {
    assert.match(
      migration,
      /add\s+column\s+if\s+not\s+exists\s+reservoir_eligibility_policy_version\s+text\s+not\s+null\s+default\s+'hspp-reservoir-eligibility-v1'/i,
    );
  },
);


test(
  "durable eligibility provenance is bounded and nonblank",
  () => {
    assert.match(
      migration,
      /hspp_recon_intent_reservoir_eligibility_policy_length/i,
    );

    assert.match(
      migration,
      /length\s*\(\s*trim\s*\(\s*reservoir_eligibility_policy_version\s*\)\s*\)\s*between\s+1\s+and\s+128/i,
    );
  },
);


test(
  "migration value exactly matches the authoritative B06A policy version",
  () => {
    assert.match(
      eligibilitySource,
      /HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION\s*=\s*"hspp-reservoir-eligibility-v1"\s+as\s+const/,
    );

    assert.match(
      migration,
      /'hspp-reservoir-eligibility-v1'/,
    );
  },
);


test(
  "migration identifies the new field as semantic eligibility rather than scheduling authority",
  () => {
    assert.match(
      migration,
      /Producer-neutral B06A Reservoir-eligibility semantic policy provenance/i,
    );

    assert.match(
      migration,
      /must not be populated from pair scheduling metadata/i,
    );
  },
);


test(
  "foundation does not mutate immutable intent rows with UPDATE",
  () => {
    assert.doesNotMatch(
      migration,
      /\bupdate\s+(?:public\.)?hspp_reconstruction_execution_intents\b/i,
    );
  },
);


test(
  "foundation does not alter legacy discovery provenance",
  () => {
    assert.doesNotMatch(
      migration,
      /alter\s+column\s+discovery_policy_version/i,
    );

    assert.doesNotMatch(
      migration,
      /drop\s+column\s+(?:if\s+exists\s+)?discovery_policy_version/i,
    );
  },
);


test(
  "foundation does not change the existing durable decision unique constraint",
  () => {
    assert.doesNotMatch(
      migration,
      /drop\s+constraint\s+(?:if\s+exists\s+)?hspp_recon_intent_decision_unique/i,
    );

    assert.doesNotMatch(
      migration,
      /constraint\s+hspp_recon_intent_decision_unique\s+unique/i,
    );
  },
);


test(
  "foundation does not replace the existing claim RPC",
  () => {
    assert.doesNotMatch(
      migration,
      /create\s+or\s+replace\s+function[\s\S]*?claim_hspp_reconstruction_execution_intent\s*\(/i,
    );

    assert.doesNotMatch(
      migration,
      /drop\s+function[\s\S]*?claim_hspp_reconstruction_execution_intent\s*\(/i,
    );
  },
);


test(
  "foundation contains no pair scheduling version as provenance",
  () => {
    assert.doesNotMatch(
      migration,
      /hspp-reservoir-pair-scheduling-v1/i,
    );

    assert.doesNotMatch(
      migration,
      /scheduling_policy_version/i,
    );
  },
);


test(
  "new files contain no trailing whitespace",
  () => {
    for (const [name, source] of [
      ["migration", migration],
      ["eligibility source", eligibilitySource],
    ]) {
      const lines =
        source.split(/\r?\n/);

      for (
        let index = 0;
        index < lines.length;
        index += 1
      ) {
        assert.doesNotMatch(
          lines[index],
          /[ \t]+$/,
          `${name} line ${index + 1} has trailing whitespace`,
        );
      }
    }
  },
);
