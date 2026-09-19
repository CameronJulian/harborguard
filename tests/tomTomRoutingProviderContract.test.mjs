import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/routing/tomTomRouting.ts",
    "utf8",
  );

test(
  "provider targets TomTom Orbis Routing v3",
  () => {
    assert.match(
      source,
      /https:\/\/api\.tomtom\.com\/maps\/orbis\/routing\/routes\/calculate/,
    );

    assert.match(
      source,
      /"TomTom-Api-Version":\s*"3"/,
    );

    assert.match(
      source,
      /"TomTom-Api-Key":\s*apiKey/,
    );
  },
);

test(
  "provider requests car live traffic and instructions",
  () => {
    assert.match(
      source,
      /travelMode:\s*"car"/,
    );

    assert.match(
      source,
      /traffic:\s*"live"/,
    );

    assert.match(
      source,
      /guidance:\s*"instructions"/,
    );

    assert.match(
      source,
      /instructionPhonetics:\s*"ipa"/,
    );
  },
);

test(
  "provider uses official v3 summary names",
  () => {
    assert.match(
      source,
      /travelDurationInSeconds/,
    );

    assert.match(
      source,
      /trafficDelayDurationInSeconds/,
    );

    assert.doesNotMatch(
      source,
      /summary\.travelTimeInSeconds/,
    );

    assert.doesNotMatch(
      source,
      /summary\.trafficDelayInSeconds/,
    );
  },
);

test(
  "provider normalizes GeoJSON route path",
  () => {
    assert.match(
      source,
      /route\.path\?\.coordinates/,
    );

    assert.match(
      source,
      /coordinate\[0\]/,
    );

    assert.match(
      source,
      /coordinate\[1\]/,
    );
  },
);

test(
  "provider consumes structured v3 guidance",
  () => {
    for (const marker of [
      "previousRoadInformation",
      "nextRoadInformation",
      "roadNames",
      "roadNumbers",
      "signpost",
      "towardName",
      "exitNumber",
      "maneuverView",
      "drivingSide",
      "landmark",
      "changeOfAngleInDegrees",
    ]) {
      assert.match(
        source,
        new RegExp(marker),
      );
    }
  },
);

test(
  "cache precedes budget and budget precedes fetch",
  () => {
    const cache =
      source.indexOf(
        "getCachedTomTomRoutingProviderResponse(",
      );

    const miss =
      source.indexOf(
        "if (!data) {",
        cache,
      );

    const reservation =
      source.indexOf(
        "reserveTomTomProviderRequest(",
        miss,
      );

    const denial =
      source.indexOf(
        "!reservation.allowed",
        reservation,
      );

    const fetch =
      source.indexOf(
        "fetch(",
        denial,
      );

    assert.ok(cache >= 0);
    assert.ok(miss > cache);
    assert.ok(reservation > miss);
    assert.ok(denial > reservation);
    assert.ok(fetch > denial);
  },
);

test(
  "provider preserves only verified maneuver-level lane semantics",
  () => {
    assert.match(
      source,
      /maneuverGuidance/,
    );

    for (const maneuver of [
      "keepLeft",
      "keepRight",
      "mergeLeftLane",
      "mergeRightLane",
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${maneuver}"`,
        ),
      );
    }
  },
);

test(
  "provider still does not invent physical lane guidance",
  () => {
    assert.doesNotMatch(
      source,
      /\blaneGuidance\b/,
    );

    assert.doesNotMatch(
      source,
      /\brecommendedLane\b/,
    );
  },
);

test(
  "provider contains exactly one network fetch",
  () => {
    assert.equal(
      source.split("fetch(").length - 1,
      1,
    );
  },
);
