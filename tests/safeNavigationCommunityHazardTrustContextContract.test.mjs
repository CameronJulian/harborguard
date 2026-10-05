import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("app/safe-navigation/page.tsx", "utf8");

test("community hazard trust context uses verification evidence", () => {
  assert.match(source, /className="hg-community-hazard-trust"/);
  assert.match(source, /aria-label="Community hazard verification"/);
  assert.match(source, /verificationCount/);
});

test("unverified community hazard shows awaiting confirmation", () => {
  assert.match(source, /Community report - awaiting confirmation/);
});

test("verified community hazard avoids unsupported driver counts", () => {
  assert.match(source, /Community report - verified/);
  assert.doesNotMatch(source, /Confirmed by 1 driver/);
  assert.doesNotMatch(source, /awaiting driver confirmation/);
});

test("existing verification workflow remains intact", () => {
  assert.match(source, /"\/api\/route-safety\/verify"/);
  assert.match(source, /confirmActiveRouteSafetyHazard/);
  assert.match(source, /resolveActiveRouteSafetyHazard/);
  assert.match(source, /Still there/);
  assert.match(source, /No longer there/);
});
