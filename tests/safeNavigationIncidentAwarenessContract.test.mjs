import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  new URL(
    "../app/safe-navigation/page.tsx",
    import.meta.url
  ),
  "utf8"
);

test(
  "incident awareness overrides only generic aggregated road-risk titles",
  () => {
    assert.match(
      page,
      /function incidentAwarenessLabel\([\s\S]*?title\.toLowerCase\(\)\s*===\s*"aggregated road-risk segment"/
    );

    assert.match(
      page,
      /if \(!mayUseIncidentType\) \{\s*return null;\s*\}/
    );
  }
);

test(
  "incident awareness exposes customer-readable route incident labels",
  () => {
    const expectedLabels = [
      ['road_closure', 'Road closure'],
      ['lane_closure', 'Lane closure'],
      ['collision', 'Accident'],
      ['roadblock', 'Roadblock'],
      ['protest', 'Protest activity'],
      ['flooding', 'Flooding'],
      ['weather_hazard', 'Weather hazard'],
      ['vehicle_breakdown', 'Vehicle breakdown'],
      ['road_hazard', 'Road hazard'],
      ['roadworks', 'Roadworks'],
      ['congestion', 'Heavy congestion'],
      ['traffic_light_outage', 'Traffic light outage'],
      ['smash_grab_hotspot', 'High-risk area'],
    ];

    const normalizedPage =
      page.replace(/\s+/g, " ");

    for (const [type, label] of expectedLabels) {
      assert.ok(
        normalizedPage.includes(
          `${type}: "${label}"`
        ),
        `missing incident awareness label for ${type}`
      );
    }
  }
);

test(
  "traffic calming remains higher priority than incident awareness",
  () => {
    const resolverMatch = page.match(
      /function activeRouteSafetyVoiceTitle\([\s\S]*?\n\}/
    );

    assert.ok(
      resolverMatch,
      "active route safety title resolver missing"
    );

    const resolver = resolverMatch[0];

    const trafficIndex =
      resolver.indexOf(
        "trafficCalmingAwarenessLabel(threat)"
      );

    const incidentIndex =
      resolver.indexOf(
        "incidentAwarenessLabel(threat)"
      );

    assert.ok(trafficIndex >= 0);
    assert.ok(incidentIndex >= 0);
    assert.ok(
      trafficIndex < incidentIndex,
      "traffic-calming awareness must remain first"
    );
  }
);

test(
  "specific existing threat titles remain authoritative",
  () => {
    assert.match(
      page,
      /const mayUseIncidentType =[\s\S]*?!title[\s\S]*?"aggregated road-risk segment"/
    );

    assert.match(
      page,
      /if \(title\) \{\s*return title;\s*\}/
    );
  }
);

test(
  "visual warning and voice warning share one incident title resolver",
  () => {
    const resolverCalls =
      page.match(
        /activeRouteSafetyVoiceTitle\(/g
      ) ?? [];

    assert.ok(
      resolverCalls.length >= 3,
      "expected resolver definition plus visual and voice usage"
    );

    assert.match(
      page,
      /\{activeRouteSafetyVoiceTitle\(\s*activeRouteSafetyWarning\.threat\s*\)\}/
    );

    assert.match(
      page,
      /const title =\s*activeRouteSafetyVoiceTitle\(\s*activeRouteSafetyWarning\.threat\s*\)/
    );
  }
);

test(
  "incident awareness introduces no direct incident API or scoring path",
  () => {
    assert.equal(
      page.includes('"/api/road-incidents'),
      false
    );

    assert.equal(
      page.includes(
        '"/api/command-center/predictive-incidents'
      ),
      false
    );

    assert.equal(
      page.includes(
        "incidentAwarenessScore"
      ),
      false
    );
  }
);