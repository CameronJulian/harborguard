import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHsppCanonicalClaims,
  type HsppCanonicalClaimSet,
} from "../lib/hspp/buildHsppCanonicalClaims";

import {
  scanHsppEvidenceAssembly,
  type HsppAssemblyScanMember,
} from "../lib/hspp/scanHsppEvidenceAssembly";

import {
  evaluateHsppAssemblyDecision,
} from "../lib/hspp/evaluateHsppAssemblyDecision";

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

function member(
  evidenceId: string,
  fingerprint: string,
  memberOrdinal: number,
  eventType: string
): HsppAssemblyScanMember {
  return {
    evidenceId,
    integrityFingerprint:
      fingerprint,
    memberOrdinal,
    canonicalClaims:
      buildHsppCanonicalClaims({
        eventType,
      }),
  };
}

test(
  "OPEN assembly scan becomes NOT_READY",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "OPEN",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
          member(
            "evidence-2",
            fingerprintB,
            2,
            "roadblock"
          ),
        ],
      });

    const result =
      evaluateHsppAssemblyDecision(
        scan
      );

    assert.equal(
      result.state,
      "NOT_READY"
    );

    assert.equal(
      result.reason,
      "ASSEMBLY_NOT_SCANNED"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "single-member sealed assembly remains NOT_READY",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
        ],
      });

    const result =
      evaluateHsppAssemblyDecision(
        scan
      );

    assert.equal(
      result.state,
      "NOT_READY"
    );

    assert.equal(
      result.reason,
      "INSUFFICIENT_EVIDENCE"
    );
  }
);

test(
  "all-UNKNOWN comparable evidence remains UNRESOLVED",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "accident"
          ),
          member(
            "evidence-2",
            fingerprintB,
            2,
            "road_closure"
          ),
        ],
      });

    assert.equal(
      scan.canonicalAgreementCount,
      0
    );

    assert.equal(
      scan.canonicalConflictCount,
      0
    );

    const result =
      evaluateHsppAssemblyDecision(
        scan
      );

    assert.equal(
      result.state,
      "UNRESOLVED"
    );

    assert.equal(
      result.reason,
      "NO_COMPARABLE_AGREEMENT"
    );
  }
);

test(
  "canonical agreement with no conflict becomes CONSISTENT",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
          member(
            "evidence-2",
            fingerprintB,
            2,
            "roadblock"
          ),
        ],
      });

    const result =
      evaluateHsppAssemblyDecision(
        scan
      );

    assert.equal(
      result.state,
      "CONSISTENT"
    );

    assert.equal(
      result.reason,
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT"
    );

    assert.ok(
      result.canonicalAgreementCount >
      0
    );

    assert.equal(
      result.canonicalConflictCount,
      0
    );

    /*
     * CONSISTENT may still preserve unresolved claims.
     */
    assert.ok(
      result.canonicalUnknownCount >
      0
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "explicit canonical contradiction becomes CONFLICTED",
  () => {
    const firstClaims =
      buildHsppCanonicalClaims({
        eventType:
          "road_closure",
      });

    const secondClaims:
      HsppCanonicalClaimSet = {
        ...buildHsppCanonicalClaims({
          eventType:
            "unknown",
        }),

        roadBlocked: {
          value:
            "FALSE",
          basis:
            "EVENT_TYPE",
        },
      };

    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          {
            evidenceId:
              "evidence-1",
            integrityFingerprint:
              fingerprintA,
            memberOrdinal:
              1,
            canonicalClaims:
              firstClaims,
          },
          {
            evidenceId:
              "evidence-2",
            integrityFingerprint:
              fingerprintB,
            memberOrdinal:
              2,
            canonicalClaims:
              secondClaims,
          },
        ],
      });

    const result =
      evaluateHsppAssemblyDecision(
        scan
      );

    assert.equal(
      result.state,
      "CONFLICTED"
    );

    assert.equal(
      result.reason,
      "CANONICAL_CONFLICT_PRESENT"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "impossible scanned summary fails closed",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
          member(
            "evidence-2",
            fingerprintB,
            2,
            "roadblock"
          ),
        ],
      });

    const invalid = {
      ...scan,
      hasCanonicalConflict:
        true,
      canonicalConflictCount:
        0,
    };

    const result =
      evaluateHsppAssemblyDecision(
        invalid
      );

    assert.equal(
      result.state,
      "NOT_READY"
    );

    assert.equal(
      result.reason,
      "INVALID_SCAN_SUMMARY"
    );
  }
);

test(
  "master decision is deterministic",
  () => {
    const scan =
      scanHsppEvidenceAssembly({
        assemblyId:
          "assembly-1",
        organizationId:
          "org-1",
        assemblyState:
          "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
          member(
            "evidence-2",
            fingerprintB,
            2,
            "roadblock"
          ),
        ],
      });

    assert.deepEqual(
      evaluateHsppAssemblyDecision(
        scan
      ),
      evaluateHsppAssemblyDecision(
        scan
      )
    );
  }
);