import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

test("community hazard freshness uses existing threat createdAt", () => {
  assert.match(
    source,
    /function communityHazardFreshnessLabel\(/
  );

  assert.match(
    source,
    /activeRouteSafetyWarning\.threat\.createdAt/
  );

  assert.match(
    source,
    /aria-label="Community hazard freshness"/
  );

  assert.match(
    source,
    /className="hg-community-hazard-freshness"/
  );
});

test("community hazard freshness uses truthful updated wording", () => {
  assert.match(
    source,
    /Updated just now/
  );

  assert.match(
    source,
    /Updated \$\{ageMinutes\} min ago/
  );

  assert.match(
    source,
    /Updated \$\{ageHours\} hr/
  );

  assert.match(
    source,
    /Updated \$\{ageDays\} day/
  );

  assert.doesNotMatch(
    source,
    /Reported \$\{/
  );
});

test("invalid or missing timestamps do not invent freshness", () => {
  assert.match(
    source,
    /if \(!createdAt\) \{\s*return null;/
  );

  assert.match(
    source,
    /if \(!Number\.isFinite\(timestamp\)\) \{\s*return null;/
  );
});

test("existing community verification trust context remains intact", () => {
  assert.match(
    source,
    /Community report - awaiting confirmation/
  );

  assert.match(
    source,
    /Community report - verified/
  );

  assert.match(
    source,
    /Still there/
  );

  assert.match(
    source,
    /No longer there/
  );
});

test("increment does not add a separate hazard freshness API path", () => {
  assert.doesNotMatch(
    source,
    /effectiveFreshnessAt/
  );

  assert.doesNotMatch(
    source,
    /last_provider_confirmation_at/
  );
});