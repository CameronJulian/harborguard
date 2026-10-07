import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routePath =
  path.resolve(
    process.cwd(),
    "app/api/route-safety/reroute/route.ts"
  );

const source =
  fs.readFileSync(
    routePath,
    "utf8"
  );

test(
  "reroute loads stored traffic once before decorating candidate routes",
  () => {
    const loaderMatches =
      source.match(
        /loadLatestStoredTrafficFlowObservations\s*\(/g
      ) ?? [];

    /*
     * One import reference plus one execution call
     * can exist in source text. The important
     * execution call appears once.
     */
    assert.match(
      source,
      /await\s+loadLatestStoredTrafficFlowObservations\s*\(/
    );

    assert.equal(
      (
        source.match(
          /await\s+loadLatestStoredTrafficFlowObservations\s*\(/g
        ) ?? []
      ).length,
      1
    );

    assert.ok(
      loaderMatches.length >= 1
    );
  }
);

test(
  "stored traffic remains organization scoped",
  () => {
    assert.match(
      source,
      /loadLatestStoredTrafficFlowObservations\s*\(\s*supabase,\s*organizationId,/
    );
  }
);

test(
  "candidate routes use shared route traffic matcher",
  () => {
    assert.match(
      source,
      /matchStoredTrafficObservationsToRoute\s*\(\s*route\.routePoints,\s*storedTrafficObservations/
    );
  }
);

test(
  "matched stored evidence is passed into CandidateTrafficContext",
  () => {
    assert.match(
      source,
      /observations:\s*matchedStoredTraffic\.map/
    );

    assert.match(
      source,
      /congestion:\s*observation\.congestion/
    );

    assert.match(
      source,
      /jamFactor:\s*observation\.jamFactor/
    );

    assert.match(
      source,
      /delayMinutes:\s*observation\.delayMinutes/
    );

    assert.match(
      source,
      /observedAt:\s*observation\.observedAt/
    );
  }
);

test(
  "stored traffic enrichment fails closed without failing route calculation",
  () => {
    assert.match(
      source,
      /catch\s*\{[\s\S]*?storedTrafficObservations\s*=\s*\[\]/
    );
  }
);

test(
  "stored traffic enrichment happens after provider routing",
  () => {
    const routingIndex =
      source.indexOf(
        "await calculateRoutesWithProvider("
      );

    const storedIndex =
      source.indexOf(
        "await loadLatestStoredTrafficFlowObservations("
      );

    assert.ok(
      routingIndex >= 0
    );

    assert.ok(
      storedIndex > routingIndex,
      "stored advisory evidence must not participate in provider routing"
    );
  }
);

test(
  "integration does not grant ranking authority",
  () => {
    assert.doesNotMatch(
      source,
      /rankRoutes\s*\(/
    );

    assert.doesNotMatch(
      source,
      /safetyScore\s*=/
    );

    assert.doesNotMatch(
      source,
      /riskScore\s*=/
    );
  }
);

test(
  "integration does not add traffic provider network calls",
  () => {
    assert.doesNotMatch(
      source,
      /traffic\.hereapi\.com/i
    );

    assert.doesNotMatch(
      source,
      /api\.tomtom\.com\/traffic/i
    );

    assert.doesNotMatch(
      source,
      /fetch\s*\(/i
    );
  }
);

test(
  "integration does not write traffic flow observations",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(["']traffic_flow_observations["']\)[\s\S]*?\.(insert|upsert|update|delete)\s*\(/
    );
  }
);

test(
  "route list and recommended route continue receiving CandidateTrafficContext",
  () => {
    assert.match(
      source,
      /result\.routes\.map\(\s*withCandidateTrafficContext/
    );

    assert.match(
      source,
      /withCandidateTrafficContext\(\s*result\?\.recommendedRoute/
    );
  }
);
