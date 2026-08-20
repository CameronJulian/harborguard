import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/telematics/processTelematicsPosition.ts",
  "utf8"
);

test("HSPP evidence is created after receipt claim and before location processing", () => {
  const claimIndex = source.indexOf("await claimTelematicsMessage");
  const duplicateBoundary = source.indexOf("if (!claim.claimed)");
  const buildIndex = source.indexOf("buildHsppEvidence({");
  const persistIndex = source.indexOf("await persistHsppEvidence({");
  const locationIndex = source.indexOf("await processVehicleLocationUpdate({");

  assert.ok(claimIndex >= 0);
  assert.ok(duplicateBoundary > claimIndex);
  assert.ok(buildIndex > duplicateBoundary);
  assert.ok(persistIndex > buildIndex);
  assert.ok(locationIndex > persistIndex);
});

test("HSPP evidence preserves Traccar provider provenance", () => {
  assert.match(source, /sourceClass:\s*"telematics"/);
  assert.match(source, /sourceProvider:\s*provider/);
  assert.match(source, /sourceStream:\s*stream/);
  assert.match(source, /sourceMessageId:\s*position\.providerMessageId/);
  assert.match(source, /observedAt:\s*position\.recordedAt/);
});

test("HSPP evidence seals the normalized telemetry payload", () => {
  assert.match(source, /payloadSchemaVersion:\s*"normalized-telematics-position-v1"/);
  assert.match(source, /providerDeviceId:\s*position\.providerDeviceId/);
  assert.match(source, /vehicleId:\s*resolved\.vehicle\.id/);
  assert.match(source, /latitude:\s*position\.latitude/);
  assert.match(source, /longitude:\s*position\.longitude/);
  assert.match(source, /speedKmh:\s*position\.speedKmh/);
  assert.match(source, /heading:\s*position\.heading/);
  assert.match(source, /recordedAt:\s*position\.recordedAt/);
});

test("HSPP evidence links to the existing claimed telematics receipt", () => {
  assert.match(
    source,
    /telematicsReceiptId:\s*claim\.receiptId/
  );

  assert.match(
    source,
    /vehicleId:\s*resolved\.vehicle\.id/
  );
});

test("HSPP persistence remains inside the existing telematics failure boundary", () => {
  const persistIndex = source.indexOf("await persistHsppEvidence({");
  const mainCatchIndex = source.indexOf("catch (error)");
  const failIndex = source.indexOf(
    "await failTelematicsMessage({",
    mainCatchIndex
  );

  assert.ok(persistIndex >= 0);
  assert.ok(mainCatchIndex > persistIndex);
  assert.ok(failIndex > mainCatchIndex);
});

test("HSPP-002 does not enable Crowd or ML eligibility", () => {
  assert.doesNotMatch(source, /trainingEligible\s*:/);
  assert.doesNotMatch(source, /crowdEligible\s*:/);
  assert.doesNotMatch(source, /route_risk_segments/);
});
