import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowAlternativeRouteEligibility,
  ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION,
} from "../lib/fleet/buildRouteRiskShadowAlternativeRouteEligibility.ts";

const policy = {
  enabled: true,
  allowedOrganizationIds: ["org-1"],
  samplingPercentage: 100,
};

const context = {
  organizationId: "org-1",
  samplingIdentity: "org-1:primary-route-fingerprint",
  providerCredentialAvailable: true,
};

test("returns a versioned eligible result for explicitly enabled valid context", () => {
  const result = buildRouteRiskShadowAlternativeRouteEligibility({
    policy,
    context,
  });

  assert.equal(result.eligibilityState, "ELIGIBLE");
  assert.equal(result.reason, null);
  assert.equal(
    result.eligibilityVersion,
    ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_ELIGIBILITY_VERSION
  );
  assert.equal(result.authority, "NON_AUTHORITATIVE");
});

test("fails closed for disabled, malformed, or unsupported policy", () => {
  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy: { ...policy, enabled: false },
      context,
    }).reason,
    "policy_disabled"
  );
  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy: { ...policy, samplingPercentage: 101 },
      context,
    }).reason,
    "invalid_configuration"
  );
  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy: { ...policy, allowedOrganizationIds: ["org-1", 42] },
      context,
    }).reason,
    "invalid_configuration"
  );
});

test("fails closed for missing context, organization, identity, or credential", () => {
  for (const [field, value, reason] of [
    ["organizationId", "", "missing_organization"],
    ["samplingIdentity", "", "missing_sampling_identity"],
    ["providerCredentialAvailable", false, "missing_provider_credential"],
  ]) {
    const result = buildRouteRiskShadowAlternativeRouteEligibility({
      policy,
      context: { ...context, [field]: value },
    });
    assert.equal(result.eligibilityState, "INELIGIBLE");
    assert.equal(result.reason, reason);
  }

  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy,
      context: { ...context, organizationId: "other-org" },
    }).reason,
    "organization_not_allowed"
  );
});

test("deterministic sampling is stable and has explicit boundary behavior", () => {
  const first = buildRouteRiskShadowAlternativeRouteEligibility({
    policy,
    context,
  });
  const second = buildRouteRiskShadowAlternativeRouteEligibility({
    policy: { ...policy },
    context: { ...context },
  });

  assert.deepEqual(first, second);
  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy: { ...policy, samplingPercentage: 0 },
      context,
    }).reason,
    "sampled_out"
  );
  assert.equal(
    buildRouteRiskShadowAlternativeRouteEligibility({
      policy: { ...policy, samplingPercentage: 100 },
      context,
    }).eligibilityState,
    "ELIGIBLE"
  );
});

test("does not mutate inputs or perform prohibited integration", () => {
  const inputPolicy = { ...policy, allowedOrganizationIds: [...policy.allowedOrganizationIds] };
  const inputContext = { ...context };
  buildRouteRiskShadowAlternativeRouteEligibility({
    policy: inputPolicy,
    context: inputContext,
  });

  assert.deepEqual(inputPolicy, policy);
  assert.deepEqual(inputContext, context);

  const source = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowAlternativeRouteEligibility.ts",
    "utf8"
  );
  const routeSource = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  const executableSource = source.replace(
    /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
    ""
  );
  assert.doesNotMatch(
    executableSource,
    /fetch\(|supabase|rpc|B14|orchestrate|registerRouteRiskShadow|persist|quota|concurr|retry|score|ranking|recommend|selection|rerout|escalat|confidence|uncertainty|calibrat|Math\.random|Date\.now|new Date/i
  );
  assert.doesNotMatch(
    routeSource,
    /buildRouteRiskShadowAlternativeRouteEligibility/
  );
  assert.match(routeSource, /computeAlternativeRoutes:\s*false/);
  assert.doesNotMatch(JSON.stringify(firstResult()), /credential|provider|secret/i);
});

function firstResult() {
  return buildRouteRiskShadowAlternativeRouteEligibility({ policy, context });
}
