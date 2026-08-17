import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  registerRouteRiskShadowPostResponse,
  ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION,
} from "../lib/fleet/registerRouteRiskShadowPostResponse.ts";

function schedulerCapture() {
  const tasks = [];
  return {
    tasks,
    scheduler(task) {
      tasks.push(task);
    },
  };
}

test("registers one supplied task through the injected lifecycle scheduler", async () => {
  const captured = schedulerCapture();
  let calls = 0;

  const result = registerRouteRiskShadowPostResponse({
    task: async () => {
      calls += 1;
    },
    scheduler: captured.scheduler,
  });

  assert.equal(result.registrationState, "REGISTERED");
  assert.equal(result.failure, null);
  assert.equal(
    result.lifecycleVersion,
    ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION
  );
  assert.equal(captured.tasks.length, 1);
  assert.equal(calls, 0);

  await captured.tasks[0]();
  assert.equal(calls, 1);
});

test("registration is deterministic and occurs once per explicit call", () => {
  const first = schedulerCapture();
  const second = schedulerCapture();
  const task = () => {};

  const firstResult = registerRouteRiskShadowPostResponse({
    task,
    scheduler: first.scheduler,
  });
  const secondResult = registerRouteRiskShadowPostResponse({
    task,
    scheduler: second.scheduler,
  });

  assert.deepEqual(firstResult, secondResult);
  assert.equal(first.tasks.length, 1);
  assert.equal(second.tasks.length, 1);
});

test("contains deferred task rejection without exposing task details", async () => {
  const captured = schedulerCapture();
  const result = registerRouteRiskShadowPostResponse({
    task: async () => {
      throw new Error("secret task detail");
    },
    scheduler: captured.scheduler,
  });

  await assert.doesNotReject(captured.tasks[0]());
  assert.equal(result.registrationState, "REGISTERED");
  assert.equal(JSON.stringify(result).includes("secret task detail"), false);
});

test("represents invalid tasks and scheduler failure without throwing", () => {
  const invalid = registerRouteRiskShadowPostResponse({
    task: null,
    scheduler: () => {
      throw new Error("scheduler failure");
    },
  });
  const failed = registerRouteRiskShadowPostResponse({
    task: () => {},
    scheduler: () => {
      throw new Error("scheduler failure");
    },
  });

  assert.equal(invalid.registrationState, "UNAVAILABLE");
  assert.equal(invalid.failure, "invalid_task");
  assert.equal(failed.registrationState, "UNAVAILABLE");
  assert.equal(failed.failure, "registration_failed");
});

test("contains only lifecycle registration semantics and is not production-integrated", () => {
  const source = fs.readFileSync(
    "lib/fleet/registerRouteRiskShadowPostResponse.ts",
    "utf8"
  );
  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  assert.match(source, /from "next\/server(?:\.js)?"/);
  assert.doesNotMatch(source, /supabase|fetch\(|retry|quota|concurr|persist/i);
  assert.doesNotMatch(
    source,
    /B14|orchestrateRouteRiskShadowGoogleAlternativeRoutes|ranking|recommend|selection|rerout|escalat|score|confidence|uncertainty|calibrat/i
  );
  assert.doesNotMatch(source, /process\.env|GOOGLE_ROUTES_API_KEY/);
  assert.doesNotMatch(
    routeSource,
    /registerRouteRiskShadowPostResponse|ROUTE_RISK_SHADOW_POST_RESPONSE_LIFECYCLE_VERSION/
  );
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
  assert.doesNotMatch(JSON.stringify(registerRouteRiskShadowPostResponse({
    task: () => {},
    scheduler: () => {},
  })), /credential|secret|provider/i);
});
