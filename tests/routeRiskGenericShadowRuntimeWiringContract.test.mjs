import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/route-safety/predict/route.ts";

const readerPath =
  "lib/fleet/readRouteRiskShadowModelArtifact.ts";

const genericParserPath =
  "lib/fleet/parseRouteRiskModelArtifact.ts";

const genericScorerPath =
  "lib/fleet/scoreRouteRiskModel.ts";

test(
  "shadow artifact reader uses the generic persisted-model parser",
  () => {
    const source =
      fs.readFileSync(
        readerPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskModelArtifact/
    );

    assert.match(
      source,
      /RouteRiskModelArtifact/
    );

    assert.doesNotMatch(
      source,
      /parseRouteRiskLogisticBaselineModel/
    );

    assert.doesNotMatch(
      source,
      /RouteRiskLogisticBaselineModel/
    );
  }
);

test(
  "live Route Safety shadow block scores through the generic model dispatcher",
  () => {
    const source =
      fs.readFileSync(
        routePath,
        "utf8"
      );

    assert.match(
      source,
      /import\s*\{\s*scoreRouteRiskModel\s*\}\s*from\s*"@\/lib\/fleet\/scoreRouteRiskModel";/
    );

    assert.match(
      source,
      /scoreRouteRiskModel\(\{\s*model:\s*artifact\.model,\s*features,/s
    );

    assert.doesNotMatch(
      source,
      /scoreRouteRiskLogisticModel/
    );
  }
);

test(
  "generic parser still explicitly delegates logistic artifacts to the logistic adapter",
  () => {
    const source =
      fs.readFileSync(
        genericParserPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskLogisticBaselineModel/
    );

    assert.match(
      source,
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );
  }
);

test(
  "generic scorer still explicitly delegates logistic scoring to the logistic adapter",
  () => {
    const source =
      fs.readFileSync(
        genericScorerPath,
        "utf8"
      );

    assert.match(
      source,
      /scoreRouteRiskLogisticModel/
    );

    assert.match(
      source,
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );
  }
);

test(
  "shadow inference remains contained before production response construction",
  () => {
    const source =
      fs.readFileSync(
        routePath,
        "utf8"
      );

    const shadowReadIndex =
      source.indexOf(
        "await readRouteRiskShadowModelArtifact"
      );

    const genericScoreIndex =
      source.indexOf(
        "scoreRouteRiskModel({",
        shadowReadIndex
      );

    const shadowCatchIndex =
      source.indexOf(
        "} catch (shadowInferenceError)",
        genericScoreIndex
      );

    const responseIndex =
      source.indexOf(
        "return NextResponse.json({",
        shadowCatchIndex
      );

    assert.ok(
      shadowReadIndex >= 0,
      "shadow artifact resolution must exist"
    );

    assert.ok(
      genericScoreIndex > shadowReadIndex,
      "generic shadow scoring must follow artifact resolution"
    );

    assert.ok(
      shadowCatchIndex > genericScoreIndex,
      "generic shadow scoring must remain inside the shadow isolation boundary"
    );

    assert.ok(
      responseIndex > shadowCatchIndex,
      "production response must remain outside shadow failure containment"
    );
  }
);

test(
  "generic shadow runtime wiring introduces no production authority",
  () => {
    const source =
      fs.readFileSync(
        routePath,
        "utf8"
      );

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
      shadowStart >= 0 &&
      shadowEnd > shadowStart
    );

    const shadowBlock =
      source.slice(
        shadowStart,
        shadowEnd
      );

    assert.doesNotMatch(
      shadowBlock,
      /riskScore\s*=\s*prediction\.predictedProbability/
    );

    assert.doesNotMatch(
      shadowBlock,
      /riskLevel\s*=/
    );

    assert.doesNotMatch(
      shadowBlock,
      /return\s+NextResponse\.json/
    );
  }
);
