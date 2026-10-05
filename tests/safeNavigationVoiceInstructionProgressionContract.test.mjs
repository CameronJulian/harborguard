import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "voice maneuver progression preserves the 500 meter approach and 150 meter near thresholds",
  () => {
    assert.match(
      page,
      /const VOICE_APPROACH_METERS = 500;/,
    );

    assert.match(
      page,
      /const VOICE_NEAR_METERS = 150;/,
    );

    assert.match(
      page,
      /distanceToNextManeuver\s*<=\s*VOICE_NEAR_METERS/,
    );

    assert.match(
      page,
      /distanceToNextManeuver\s*<=\s*VOICE_APPROACH_METERS/,
    );
  },
);

test(
  "navigation voice text prefers provider speech and safely falls back to instruction content",
  () => {
    assert.match(
      page,
      /instruction\.voiceText\?\.trim\(\)\s*\|\|\s*instruction\.text\?\.trim\(\)/,
    );

    assert.match(
      page,
      /\[\s*instruction\.action,\s*instruction\.direction,\s*\][\s\S]{0,160}?\.filter\(Boolean\)[\s\S]{0,120}?\.join\(" "\)/,
    );

    assert.match(
      page,
      /instruction\.landmark\?\.trim\(\)/,
    );

    assert.match(
      page,
      /`\\?\$\{raw\}\. Landmark: \\?\$\{landmark\}`/,
    );

    assert.match(
      page,
      /\.replace\(\/<\[\^>\]\*>\/g,\s*" "\)/,
    );

    assert.match(
      page,
      /\.replace\(\/\\s\+\/g,\s*" "\)/,
    );
  },
);

test(
  "normal maneuver speech requires valid active navigation ownership",
  () => {
    assert.match(
      page,
      /!voiceEnabled\s*\|\|\s*!gpsActive\s*\|\|\s*gpsAccuracyPoor\s*\|\|\s*routing\s*\|\|\s*autoRerouteActive\s*\|\|\s*!selectedRoute/,
    );

    assert.match(
      page,
      /!nextInstruction\s*\|\|\s*distanceToNextManeuver == null\s*\|\|\s*activeInstructionIndex < 0/,
    );
  },
);

test(
  "arrival speech takes priority over ordinary maneuver progression",
  () => {
    assert.match(
      page,
      /if \(hasReachedDestination\) \{[\s\S]{0,1200}?speakNavigationInstruction\([\s\S]{0,500}?arrivalKey,[\s\S]{0,500}?arrivalMessage,[\s\S]{0,120}?true[\s\S]{0,180}?\);[\s\S]{0,160}?return;/,
    );

    assert.match(
      page,
      /Your destination is on the \$\{arrivalSide\}/,
    );
  },
);

test(
  "maneuver announcement identity is stable for the owned next instruction",
  () => {
    assert.match(
      page,
      /const nextInstructionIndex\s*=\s*activeInstructionIndex \+ 1;/,
    );

    assert.match(
      page,
      /const routeOffset\s*=[\s\S]{0,220}?nextInstruction\.routeOffsetMeters\s*\?\?[\s\S]{0,120}?nextInstruction\.offset/,
    );

    assert.match(
      page,
      /const instructionIdentity\s*=\s*`\$\{nextInstructionIndex\}:\$\{routeOffset\}:\$\{spokenInstruction\}`;/,
    );

    assert.match(
      page,
      /const approachKey\s*=\s*`approach:\$\{instructionIdentity\}`;/,
    );

    assert.match(
      page,
      /const nearKey\s*=\s*`near:\$\{instructionIdentity\}`;/,
    );
  },
);

test(
  "near maneuver guidance suppresses a later duplicate approach warning",
  () => {
    assert.match(
      page,
      /distanceToNextManeuver\s*<=\s*VOICE_NEAR_METERS[\s\S]{0,900}?speakNavigationInstruction\([\s\S]{0,220}?nearKey,[\s\S]{0,420}?spokenInstruction[\s\S]{0,260}?\);/,
    );

    assert.match(
      page,
      /if \(didSpeak\) \{[\s\S]{0,220}?lastSpokenAnnouncementRef\.current\.add\([\s\S]{0,100}?approachKey[\s\S]{0,100}?\);/,
    );

    assert.match(
      page,
      /if \(didSpeak\)[\s\S]{0,380}?return;/,
    );
  },
);

test(
  "approach guidance uses the same maneuver identity and spoken instruction",
  () => {
    assert.match(
      page,
      /distanceToNextManeuver\s*<=\s*VOICE_APPROACH_METERS[\s\S]{0,500}?speakNavigationInstruction\([\s\S]{0,180}?approachKey,[\s\S]{0,400}?spokenInstruction/,
    );
  },
);

test(
  "route lifecycle resets spoken announcement ownership",
  () => {
    const clearMatches =
      page.match(
        /lastSpokenAnnouncementRef\.current\.clear\(\);/g,
      ) ?? [];

    assert.ok(
      clearMatches.length >= 5,
      `expected multiple lifecycle clear paths, found ${clearMatches.length}`,
    );

    assert.match(
      page,
      /window\.speechSynthesis\.cancel\(\);/,
    );
  },
);