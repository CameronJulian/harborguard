import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const processSource =
  fs.readFileSync(
    "lib/fleet/processVehicleLocationUpdate.ts",
    "utf8"
  );

const routeSource =
  fs.readFileSync(
    "app/api/fleet/update-location/route.ts",
    "utf8"
  );

const crowdSource =
  fs.readFileSync(
    "lib/fleet/recordCrowdLocationQualityOutcome.ts",
    "utf8"
  );


test(
  "process layer does not perform observability RPC",
  () => {

    assert.doesNotMatch(
      processSource,
      /recordCrowdLocationQualityOutcome/
    );

    assert.doesNotMatch(
      processSource,
      /await\s+recordCrowdLocationQualityOutcome/
    );
  }
);


test(
  "process exposes typed observability event",
  () => {

    assert.match(
      processSource,
      /export type CrowdLocationQualityObservabilityEvent/
    );

    assert.match(
      processSource,
      /source:\s*ParsedUpdateLocationInput\["source"\]/
    );

    assert.match(
      processSource,
      /"accepted"[\s\S]*"jitter"[\s\S]*"gps_spike"/
    );

    assert.match(
      processSource,
      /occurredAt:\s*string/
    );
  }
);


test(
  "skipped outcome carries exact event",
  () => {

    assert.match(
      processSource,
      /skipped:\s*telemetryAnalysis\.skipped,[\s\S]*observabilityEvent:\s*\{[\s\S]*source,[\s\S]*outcome:\s*telemetryAnalysis\.skipped,[\s\S]*occurredAt/
    );
  }
);


test(
  "accepted outcome carries exact event",
  () => {

    assert.match(
      processSource,
      /observabilityEvent:\s*\{[\s\S]*source,[\s\S]*outcome:\s*"accepted",[\s\S]*occurredAt/
    );
  }
);


test(
  "route owns post-response scheduling",
  () => {

    assert.match(
      routeSource,
      /import\s*\{\s*after,\s*NextResponse\s*\}\s*from\s*"next\/server"/
    );

    const calls =
      (
        routeSource.match(
          /\bafter\s*\(/g
        ) ||
        []
      ).length;

    assert.equal(
      calls,
      1
    );

    assert.match(
      routeSource,
      /after\(async\s*\(\)\s*=>\s*\{[\s\S]*await\s+recordCrowdLocationQualityOutcome\([\s\S]*result\.observabilityEvent/
    );
  }
);


test(
  "existing successful response shapes remain",
  () => {

    assert.match(
      routeSource,
      /result\.skipped\s*===\s*"jitter"/
    );

    assert.match(
      routeSource,
      /result\.skipped\s*===\s*"gps_spike"/
    );

    assert.match(
      routeSource,
      /Vehicle location updated successfully/
    );
  }
);


test(
  "RPC helper remains non-fatal best effort",
  () => {

    assert.match(
      crowdSource,
      /await\s+supabaseAdmin\.rpc/
    );

    assert.match(
      crowdSource,
      /console\.error/
    );

    assert.doesNotMatch(
      crowdSource,
      /\bthrow\b/
    );
  }
);