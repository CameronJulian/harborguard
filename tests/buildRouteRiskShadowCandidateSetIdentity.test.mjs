import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildRouteRiskShadowCandidateSetIdentity,
  ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION,
} from "../lib/fleet/buildRouteRiskShadowCandidateSetIdentity.ts";

import {
  ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
} from "../lib/fleet/buildRouteRiskShadowCandidateRouteIdentity.ts";

const fingerprintA =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const fingerprintB =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function candidateRouteIdentity(
  routeFingerprint,
  overrides = {}
) {
  return {
    identityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    semantics:
      "DESCRIPTIVE_CANONICAL_ROUTE_GEOMETRY_IDENTITY",
    authority:
      "NON_AUTHORITATIVE",
    identityState:
      "AVAILABLE",
    algorithm:
      "SHA-256",
    routeFingerprint,
    routeEvidenceScopeVersion:
      "harborguard-route-risk-shadow-route-evidence-scope-v1",
    scopeSource:
      "provider_geometry",
    unavailableReason: null,
    ...overrides,
  };
}

test("builds a deterministic explicitly versioned SHA-256 candidate-set identity", () => {
  const first =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });
  const second =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });

  assert.deepEqual(first, second);
  assert.equal(
    first.setVersion,
    ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION
  );
  assert.equal(first.identityState, "AVAILABLE");
  assert.equal(first.algorithm, "SHA-256");
  assert.equal(
    first.candidateRouteIdentityVersion,
    ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION
  );
  assert.match(
    first.setFingerprint,
    /^[0-9a-f]{64}$/
  );
  assert.equal(first.memberCount, 2);
});

test("produces the fixed fingerprint for the canonical candidate set fixture", () => {
  const result =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });

  assert.equal(
    result.setFingerprint,
    "6e5d2848b13bf69ad1869db9c04e191d9deedf2fcc6afed43528a5ba4605cae4"
  );
});

test("normalizes membership order without changing set identity", () => {
  const forward =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });
  const reversed =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintB),
        candidateRouteIdentity(fingerprintA),
      ],
    });

  assert.equal(
    forward.setFingerprint,
    reversed.setFingerprint
  );
  assert.deepEqual(
    forward.memberRouteFingerprints,
    [fingerprintA, fingerprintB]
  );
});

test("changes identity when one candidate-route fingerprint changes", () => {
  const original =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });
  const changed =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        ),
      ],
    });

  assert.notEqual(
    original.setFingerprint,
    changed.setFingerprint
  );
});

test("does not accept prediction/model descriptive fields as identity inputs", () => {
  const base =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintB),
      ],
    });
  const descriptive =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA, {
          predictionCreatedAt:
            "2026-08-16T12:00:00.000Z",
          model: {
            registryId: "model-a",
          },
          probability: 0.82,
          evidenceAssessment: {
            state: "UNKNOWN",
          },
          travelCostProvenance: {
            provenanceVersion: "cost-v1",
          },
        }),
        candidateRouteIdentity(fingerprintB),
      ],
    });

  assert.equal(
    base.setFingerprint,
    descriptive.setFingerprint
  );
});

test("rejects duplicate candidate-route fingerprints", () => {
  const result =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA),
        candidateRouteIdentity(fingerprintA),
      ],
    });

  assert.equal(result.identityState, "UNAVAILABLE");
  assert.equal(result.setFingerprint, null);
  assert.equal(
    result.unavailableReason,
    "duplicate_candidate_route_fingerprint"
  );
});

test("propagates unavailable or unsupported members deterministically", () => {
  const unavailable =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA, {
          identityState: "UNAVAILABLE",
          routeFingerprint: null,
          unavailableReason:
            "insufficient_route_points",
        }),
      ],
    });
  const unsupported =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [
        candidateRouteIdentity(fingerprintA, {
          identityVersion: "candidate-route-v0",
        }),
      ],
    });

  assert.equal(
    unavailable.unavailableReason,
    "unavailable_candidate_route_identity"
  );
  assert.equal(unavailable.setFingerprint, null);
  assert.equal(
    unsupported.unavailableReason,
    "unsupported_candidate_route_identity_version"
  );
  assert.equal(unsupported.setFingerprint, null);
});

test("empty candidate collections are unavailable", () => {
  const result =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: [],
    });

  assert.equal(result.identityState, "UNAVAILABLE");
  assert.equal(result.setFingerprint, null);
  assert.equal(
    result.unavailableReason,
    "empty_candidate_collection"
  );
});

test("does not mutate inputs and remains pure and unintegrated", () => {
  const input = [
    candidateRouteIdentity(fingerprintB),
    candidateRouteIdentity(fingerprintA),
  ];
  const before = structuredClone(input);
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowCandidateSetIdentity.ts",
    "utf8"
  );
  const productionRoute = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  const result =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: input,
    });

  assert.deepEqual(input, before);
  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowCandidateSetIdentity"
    ),
    false
  );

  for (const forbiddenOperation of [
    ".from(",
    ".rpc(",
    "fetch(",
    "crowd_segment_traversals",
    "crowd_segment_exposure_stats",
    "scoreRouteRiskLogisticModel",
    "persistRouteRiskShadowPrediction",
    "NextResponse",
    "candidateSet",
    "forecastSet",
    "predictionCreatedAt",
    "model",
    "probability",
    "rank",
    "recommendation",
    "selectedRoute",
    "forecastingEvent",
    "new Date()",
  ]) {
    assert.equal(
      helper.includes(forbiddenOperation),
      false
    );
  }

  for (const forbiddenField of [
    "predictionCreatedAt",
    "snapshotId",
    "model",
    "probability",
    "evidenceAssessment",
    "travelCostProvenance",
    "rank",
    "recommendation",
    "selectedRoute",
    "forecastSetId",
    "forecastingEvent",
  ]) {
    assert.equal(
      forbiddenField in result,
      false
    );
  }
});
