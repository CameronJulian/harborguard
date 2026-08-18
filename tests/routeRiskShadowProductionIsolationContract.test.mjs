import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/route-safety/predict/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test("shadow inference starts only after a persisted production prediction snapshot exists", () => {
  const snapshotInsertIndex =
    source.indexOf(
      '.from("route_prediction_snapshots")'
    );

  const shadowArtifactIndex =
    source.indexOf(
      "await readRouteRiskShadowModelArtifact"
    );

  assert.ok(
    snapshotInsertIndex >= 0,
    "production prediction snapshot persistence must exist"
  );

  assert.ok(
    shadowArtifactIndex >= 0,
    "shadow artifact resolution must exist"
  );

  assert.ok(
    snapshotInsertIndex < shadowArtifactIndex,
    "shadow inference must occur only after production snapshot persistence"
  );

  assert.match(
    source,
    /else if\s*\(\s*snapshot\?\.id\s*\)\s*\{[\s\S]*?await readRouteRiskShadowModelArtifact/
  );
});

test("shadow model consumes the same prediction-time risk values persisted by production", () => {
  assert.match(
    source,
    /overall_risk_score:\s*riskScore/
  );

  assert.match(
    source,
    /threat_risk_score:\s*threatRiskScore/
  );

  assert.match(
    source,
    /weather_risk_score:\s*weatherRiskScore/
  );

  assert.match(
    source,
    /traffic_risk_score:\s*trafficRiskScore/
  );

  assert.match(
    source,
    /const features\s*=\s*\{\s*overallRiskScore:\s*riskScore,\s*threatRiskScore,\s*weatherRiskScore,\s*trafficRiskScore,\s*\}/
  );

  assert.match(
    source,
    /scoreRouteRiskModel\(\{\s*model:\s*artifact\.model,\s*features,\s*\}\)/
  );
});

test("shadow prediction is bound to the exact production snapshot and immutable artifact identity", () => {
  assert.match(
    source,
    /persistRouteRiskShadowPrediction\(\{\s*supabase:\s*supabaseAdmin,\s*productionSnapshotId:\s*snapshot\.id,\s*artifact,\s*features,\s*prediction,/
  );

  assert.match(
    source,
    /metadata:\s*\{\s*evidenceSufficiency,\s*routeEvidenceScope,\s*candidateRouteIdentity,\s*advisoryRouteForecast,\s*travelCostProvenance,\s*\}/
  );
});

test("shadow inference failure is contained before the production response", () => {
  const shadowReadIndex =
    source.indexOf(
      "await readRouteRiskShadowModelArtifact"
    );

  const shadowPersistenceIndex =
    source.indexOf(
      "await persistRouteRiskShadowPrediction"
    );

  const shadowCatchIndex =
    source.indexOf(
      "} catch (shadowInferenceError)",
      shadowPersistenceIndex
    );

  const responseIndex =
    source.indexOf(
      "return NextResponse.json({",
      shadowCatchIndex
    );

  assert.ok(
    shadowReadIndex >= 0,
    "shadow inference must exist"
  );

  assert.ok(
    shadowPersistenceIndex > shadowReadIndex,
    "shadow persistence must follow inference"
  );

  assert.ok(
    shadowCatchIndex > shadowPersistenceIndex,
    "shadow inference and persistence must be inside the isolation catch boundary"
  );

  assert.ok(
    responseIndex > shadowCatchIndex,
    "production response must be constructed after shadow failure containment"
  );

  assert.match(
    source,
    /catch\s*\(\s*shadowInferenceError\s*\)\s*\{[\s\S]*?Route-risk shadow inference failed/
  );
});

test("shadow model probability is not substituted into production Route Safety output", () => {
  const shadowCatchIndex =
    source.indexOf(
      "} catch (shadowInferenceError)"
    );

  const responseIndex =
    source.indexOf(
      "return NextResponse.json({",
      shadowCatchIndex
    );

  assert.ok(
    shadowCatchIndex >= 0
  );

  assert.ok(
    responseIndex > shadowCatchIndex
  );

  const productionResponse =
    source.slice(
      responseIndex
    );

  assert.match(
    productionResponse,
    /riskScore,/
  );

  assert.match(
    productionResponse,
    /riskLevel,/
  );

  assert.match(
    productionResponse,
    /threatRiskScore,/
  );

  assert.match(
    productionResponse,
    /weatherRiskScore,/
  );

  assert.match(
    productionResponse,
    /trafficRiskScore,/
  );

  assert.doesNotMatch(
    productionResponse,
    /predictedProbability/
  );

  assert.doesNotMatch(
    productionResponse,
    /shadowProbability/
  );

  assert.doesNotMatch(
    productionResponse,
    /shadowPrediction/
  );

  assert.doesNotMatch(
    productionResponse,
    /artifact\.model/
  );
});

test("shadow inference itself creates no production escalation or reroute decision", () => {
  const shadowStart =
    source.indexOf(
      "await readRouteRiskShadowModelArtifact"
    );

  const shadowEnd =
    source.indexOf(
      "} catch (shadowInferenceError)",
      shadowStart
    );

  assert.ok(
    shadowStart >= 0
  );

  assert.ok(
    shadowEnd > shadowStart
  );

  const shadowBlock =
    source.slice(
      shadowStart,
      shadowEnd
    );

  assert.doesNotMatch(
    shadowBlock,
    /\/api\/route-safety\/escalate/
  );

  assert.doesNotMatch(
    shadowBlock,
    /\/api\/route-safety\/reroute/
  );

  assert.doesNotMatch(
    shadowBlock,
    /autoEscalated\s*=/
  );

  assert.doesNotMatch(
    shadowBlock,
    /autoRouteAssigned\s*=/
  );

  assert.doesNotMatch(
    shadowBlock,
    /riskScore\s*=\s*prediction/
  );

  assert.doesNotMatch(
    shadowBlock,
    /riskLevel\s*=\s*prediction/
  );
});
