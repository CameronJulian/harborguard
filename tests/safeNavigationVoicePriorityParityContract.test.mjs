import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

function voiceHazardBlock() {
  const marker =
    "Speak the existing active-route safety warning through the";

  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0);

  const start = source.indexOf(
    "  useEffect(() => {",
    markerIndex,
  );

  const end = source.indexOf(
    "  useEffect(() => {",
    start + 1,
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  return source.slice(start, end);
}

test("voice hazard consumes the same active winner as the visual warning", () => {
  const block = voiceHazardBlock();

  assert.match(block, /activeRouteSafetyWarning/);
  assert.match(
    block,
    /activeRouteSafetyVoiceKey\(\s*activeRouteSafetyWarning\s*\)/,
  );
  assert.match(
    block,
    /activeRouteSafetyVoiceTitle\(\s*activeRouteSafetyWarning\.threat\s*\)/,
  );
  assert.doesNotMatch(block, /activeRouteSafetyThreats/);
});

test("active hazard winner interrupts older queued speech", () => {
  const block = voiceHazardBlock();

  assert.match(
    block,
    /speakNavigationInstruction\([\s\S]*?announcementKey,[\s\S]*?`Safety alert ahead\.[\s\S]*?true[\s\S]*?\);/,
  );
});

test("shared speech helper cancels existing speech only when interruption is requested", () => {
  assert.match(source, /interruptExisting = false/);
  assert.match(
    source,
    /speechEngine\.speaking \|\|[\s\S]*?speechEngine\.pending/,
  );
  assert.match(
    source,
    /if \(!interruptExisting\)[\s\S]*?return false;[\s\S]*?speechEngine\.cancel\(\);/,
  );
});

test("hazard voice remains gated by trusted navigation state", () => {
  const block = voiceHazardBlock();

  assert.match(block, /!voiceEnabled/);
  assert.match(block, /!gpsActive/);
  assert.match(block, /gpsAccuracyPoor/);
  assert.match(block, /routing/);
  assert.match(block, /autoRerouteActive/);
  assert.match(block, /!selectedRoute/);
  assert.match(block, /hasReachedDestination/);
  assert.match(block, /!activeRouteSafetyWarning/);
});

test("hazard deduplication identity remains stable", () => {
  assert.match(source, /function activeRouteSafetyVoiceKey\(/);
  assert.match(
    source,
    /return `route-safety-threat:\$\{id\}`;/,
  );
});
