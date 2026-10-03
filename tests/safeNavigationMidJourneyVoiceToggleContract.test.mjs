import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pagePath = new URL(
  "../app/safe-navigation/page.tsx",
  import.meta.url
);

const source = fs.readFileSync(pagePath, "utf8");

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    `Missing start marker: ${startMarker}`
  );

  const end = source.indexOf(
    endMarker,
    start + startMarker.length
  );

  assert.notEqual(
    end,
    -1,
    `Missing end marker after ${startMarker}: ${endMarker}`
  );

  return source.slice(start, end);
}

function voiceToggleHandler() {
  return sliceBetween(
    "function toggleVoiceGuidance()",
    "  useEffect(() => {"
  );
}

test(
  "turning voice guidance off disables speech immediately",
  () => {
    const body = voiceToggleHandler();

    assert.match(
      body,
      /if\s*\(voiceEnabled\)/
    );

    assert.match(
      body,
      /setVoiceEnabled\(false\);/
    );

    assert.match(
      body,
      /lastSpokenAnnouncementRef\.current\.clear\(\);/
    );

    assert.match(
      body,
      /window\.speechSynthesis\.cancel\(\);/
    );

    assert.match(
      body,
      /setVoiceStatusMessage\(\s*"Voice guidance off"\s*\);/
    );
  }
);

test(
  "turning voice guidance back on re-enables the same journey voice lifecycle",
  () => {
    const body = voiceToggleHandler();

    assert.match(
      body,
      /setVoiceEnabled\(true\);/
    );

    assert.match(
      body,
      /lastSpokenAnnouncementRef\.current\.clear\(\);/
    );

    assert.match(
      body,
      /window\.speechSynthesis\.cancel\(\);/
    );

    assert.match(
      body,
      /setVoiceStatusMessage\(\s*"Voice guidance on"\s*\);/
    );
  }
);

test(
  "voice toggle does not end navigation",
  () => {
    const body = voiceToggleHandler();

    assert.doesNotMatch(
      body,
      /endNavigation\(\);/
    );

    assert.doesNotMatch(
      body,
      /setRoutes\(\[\]\);/
    );

    assert.doesNotMatch(
      body,
      /setNavigationInstructions\(\[\]\);/
    );
  }
);

test(
  "voice toggle does not stop or reset simulator playback",
  () => {
    const body = voiceToggleHandler();

    assert.doesNotMatch(
      body,
      /clearSimulatorTimer\(\);/
    );

    assert.doesNotMatch(
      body,
      /setSimulatorRunning\(false\);/
    );

    assert.doesNotMatch(
      body,
      /simulatorPointsRef\.current\s*=\s*\[\];/
    );

    assert.doesNotMatch(
      body,
      /simulatorIndexRef\.current\s*=\s*0;/
    );
  }
);

test(
  "navigation speech is suppressed while voice guidance is off",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!voiceEnabled\s*\|\|\s*!gpsActive\s*\|\|\s*gpsAccuracyPoor\s*\|\|\s*routing\s*\|\|\s*autoRerouteActive\s*\|\|\s*!selectedRoute\s*\)/
    );
  }
);

test(
  "overspeed voice is also suppressed while voice guidance is off",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!voiceEnabled\s*\|\|\s*gpsAccuracyPoor\s*\|\|\s*!overspeedVoiceArmedRef\.current\s*\)\s*\{\s*return;\s*\}/
    );

    assert.match(
      source,
      /speakNavigationInstruction\(\s*"overspeed-warning",\s*"Warning\. You are exceeding the speed limit\.",\s*true\s*\)/
    );
  }
);

test(
  "voice control remains a user toggle without route lifecycle ownership",
  () => {
    const start =
      source.indexOf(
        "onClick={toggleVoiceGuidance}"
      );

    assert.notEqual(
      start,
      -1,
      "Voice toggle button must exist"
    );

    const end =
      source.indexOf(
        "</button>",
        start
      );

    assert.notEqual(
      end,
      -1,
      "Voice toggle button boundary must exist"
    );

    const buttonArea =
      source.slice(start, end);

    assert.match(
      buttonArea,
      /aria-pressed=\{voiceEnabled\}/
    );

    assert.match(
      buttonArea,
      /Voice Guidance:/
    );
  }
);