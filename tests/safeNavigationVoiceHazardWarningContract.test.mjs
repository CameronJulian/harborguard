import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(
  new URL(
    "../app/safe-navigation/page.tsx",
    import.meta.url
  )
);

const source =
  fs.readFileSync(
    pagePath,
    "utf8"
  );

function voiceHazardBlock() {
  const marker =
    source.indexOf(
      "CUSTOMER INCREMENT #3"
    );

  assert.notEqual(
    marker,
    -1,
    "Increment #3 marker must exist"
  );

  const effectStart =
    source.indexOf(
      "  useEffect(() => {",
      marker
    );

  assert.notEqual(
    effectStart,
    -1,
    "Voice hazard effect must exist"
  );

  const nextEffect =
    source.indexOf(
      "  useEffect(() => {",
      effectStart + 1
    );

  assert.notEqual(
    nextEffect,
    -1,
    "Existing turn-by-turn effect must remain"
  );

  return source.slice(
    marker,
    nextEffect
  );
}

test(
  "voice hazard warning reuses existing route-safety warning",
  () => {
    const block =
      voiceHazardBlock();

    assert.match(
      block,
      /activeRouteSafetyWarning/
    );

    assert.match(
      block,
      /speakNavigationInstruction\(/
    );

    assert.doesNotMatch(
      block,
      /fetch\(/i
    );

    assert.doesNotMatch(
      block,
      /fetchWithAuth\(/i
    );
  }
);

test(
  "voice hazard warning requires active trusted navigation state",
  () => {
    const block =
      voiceHazardBlock();

    assert.match(
      block,
      /!voiceEnabled/
    );

    assert.match(
      block,
      /!gpsActive/
    );

    assert.match(
      block,
      /gpsAccuracyPoor/
    );

    assert.match(
      block,
      /routing/
    );

    assert.match(
      block,
      /autoRerouteActive/
    );

    assert.match(
      block,
      /!selectedRoute/
    );

    assert.match(
      block,
      /hasReachedDestination/
    );

    assert.match(
      block,
      /!activeRouteSafetyWarning/
    );
  }
);

test(
  "voice hazard warning uses stable threat identity",
  () => {
    assert.match(
      source,
      /function activeRouteSafetyVoiceKey/
    );

    assert.match(
      source,
      /route-safety-threat:\$\{id\}/
    );

    assert.match(
      source,
      /toFixed\(5\)/
    );
  }
);

test(
  "voice hazard warning reuses shared speech deduplication",
  () => {
    assert.match(
      source,
      /lastSpokenAnnouncementRef\.current\.has/
    );

    assert.match(
      source,
      /lastSpokenAnnouncementRef\.current\.add/
    );

    const block =
      voiceHazardBlock();

    assert.match(
      block,
      /speakNavigationInstruction\(/
    );

    assert.doesNotMatch(
      block,
      /new SpeechSynthesisUtterance/
    );

    assert.doesNotMatch(
      block,
      /speechSynthesis\.speak/
    );
  }
);

test(
  "spoken safety copy remains short and evidence based",
  () => {
    const block =
      voiceHazardBlock();

    assert.match(
      block,
      /Safety alert ahead\./
    );

    assert.match(
      block,
      /metres ahead\./
    );

    assert.doesNotMatch(
      block,
      /confidence/
    );

    assert.doesNotMatch(
      block,
      /verificationCount/
    );

    assert.doesNotMatch(
      block,
      /provider/
    );

    assert.doesNotMatch(
      block,
      /riskScore/
    );

    assert.doesNotMatch(
      block,
      /safetyScore/
    );

    assert.doesNotMatch(
      block,
      /recommendation/
    );
  }
);

test(
  "first voice hazard increment does not interrupt current speech",
  () => {
    const block =
      voiceHazardBlock();

    assert.match(
      block,
      /speakNavigationInstruction\(\s*announcementKey,\s*`Safety alert ahead\./
    );

    assert.doesNotMatch(
      block,
      /speakNavigationInstruction\([\s\S]*?,\s*true\s*\)/
    );
  }
);

test(
  "existing visual safety warning and alternative route remain present",
  () => {
    assert.match(
      source,
      /Safety alert ahead/
    );

    assert.match(
      source,
      /Alternative route available/
    );

    assert.match(
      source,
      /Take Alternative Route/
    );
  }
);