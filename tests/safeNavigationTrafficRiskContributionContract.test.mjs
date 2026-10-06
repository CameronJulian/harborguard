import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8"
);

const predictApi = fs.readFileSync(
  "app/api/route-safety/predict/route.ts",
  "utf8"
);

test(
  "Safe Navigation reuses the existing Route Safety prediction endpoint",
  () => {
    assert.match(
      page,
      /\/api\/route-safety\/predict/
    );

    assert.doesNotMatch(
      page,
      /\/api\/traffic-intelligence/
    );

    assert.doesNotMatch(
      page,
      /\/api\/weather\/current/
    );
  }
);

test(
  "authoritative prediction already exposes traffic contribution",
  () => {
    assert.match(
      predictApi,
      /trafficContribution/
    );

    assert.match(
      predictApi,
      /trafficRiskScore/
    );

    assert.match(
      predictApi,
      /trafficRiskLevel/
    );
  }
);

test(
  "Safe Navigation parses traffic contribution from the existing prediction response",
  () => {
    assert.match(
      page,
      /typeof result\?\.trafficContribution === "number"/
    );

    assert.match(
      page,
      /Number\.isFinite\(result\.trafficContribution\)/
    );
  }
);

test(
  "live road intelligence retains traffic contribution",
  () => {
    assert.match(
      page,
      /trafficContribution: number \| null/
    );

    assert.match(
      page,
      /trafficContribution,\s*\n\s*averageDelayMinutes/
    );
  }
);

test(
  "traffic score is visible as a score rather than a probability",
  () => {
    assert.match(
      page,
      /Traffic risk \$\{intelligence\.trafficRiskLevel\.toLowerCase\(\)\}/
    );

    assert.match(
      page,
      /intelligence\.trafficRiskScore/
    );

    assert.match(
      page,
      /\/100/
    );

    assert.doesNotMatch(
      page,
      /Traffic probability/
    );
  }
);

test(
  "driver can see traffic contribution to route risk",
  () => {
    assert.match(
      page,
      /Traffic adds \$\{Math\.round\(/
    );

    assert.match(
      page,
      /route-risk point/
    );
  }
);

test(
  "existing road-risk and route-threat intelligence remains authoritative",
  () => {
    assert.match(
      predictApi,
      /\.from\("road_risk_segments"\)/
    );

    assert.match(
      predictApi,
      /threats: routeThreats/
    );

    assert.match(
      page,
      /activeRouteSafetyThreats/
    );
  }
);

test(
  "existing Why this route surface remains the driver-facing home for live road intelligence",
  () => {
    assert.match(
      page,
      /Why this route\?/
    );

    assert.match(
      page,
      /aria-label="Live road intelligence"/
    );

    assert.match(
      page,
      /Live road conditions/
    );
  }
);