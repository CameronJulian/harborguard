import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test(
  "Safe Navigation preserves traffic-calming metadata on route threats",
  () => {
    assert.match(
      page,
      /type TrafficCalmingAwarenessContext = \{/,
    );

    assert.match(
      page,
      /featureType:[\s\S]{0,100}?"speed_bump"[\s\S]{0,100}?"raised_intersection"/,
    );

    assert.match(
      page,
      /trafficCalmingContext\?: TrafficCalmingAwarenessContext \| null;/,
    );
  },
);

test(
  "traffic-calming awareness maps only supported feature types",
  () => {
    assert.match(
      page,
      /function trafficCalmingAwarenessLabel\(/,
    );

    assert.match(
      page,
      /context\.featureType === "speed_bump"[\s\S]{0,120}?return "Speed bump";/,
    );

    assert.match(
      page,
      /context\.featureType ===[\s\S]{0,80}?"raised_intersection"[\s\S]{0,120}?return "Raised intersection";/,
    );

    assert.match(
      page,
      /return null;/,
    );
  },
);

test(
  "existing voice warning reuses the traffic-calming awareness label",
  () => {
    assert.match(
      page,
      /function activeRouteSafetyVoiceTitle\([\s\S]{0,280}?trafficCalmingAwarenessLabel\(threat\)/,
    );

    assert.match(
      page,
      /if \(trafficCalmingLabel\) \{[\s\S]{0,100}?return trafficCalmingLabel;/,
    );

    assert.match(
      page,
      /`Safety alert ahead\. \$\{title\}\. \$\{distanceMeters\} metres ahead\.`/,
    );
  },
);

test(
  "existing warning card reuses the same traffic-calming awareness label",
  () => {
    assert.match(
      page,
      /trafficCalmingAwarenessLabel\([\s\S]{0,80}?activeRouteSafetyWarning\.threat[\s\S]{0,120}?\)\s*\|\|[\s\S]{0,120}?activeRouteSafetyWarning\.threat\.title/,
    );

    assert.match(
      page,
      /activeRouteSafetyWarning\.distanceAheadMeters/,
    );
  },
);

test(
  "traffic-calming awareness does not introduce a second API or scoring path",
  () => {
    assert.doesNotMatch(
      page,
      /\/api\/traffic-calming/,
    );

    assert.doesNotMatch(
      page,
      /trafficCalmingRiskScore/,
    );

    assert.doesNotMatch(
      page,
      /trafficCalmingContribution/,
    );
  },
);

test(
  "drainage and watercourse data are not promoted into driver warnings",
  () => {
    assert.doesNotMatch(
      page,
      /activeRouteSafetyWarning\.threat\.openWatercourseContext/,
    );

    assert.doesNotMatch(
      page,
      /activeRouteSafetyWarning\.threat\.mainDrainageContext/,
    );

    assert.doesNotMatch(
      page,
      /activeRouteSafetyWarning\.threat\.drainageCatchmentContext/,
    );
  },
);