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

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

const fingerprintC =
  "c".repeat(64);

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
  "OPEN assembly is not scanned as completed",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "OPEN",
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

    assert.equal(
      result.state,
      "NOT_SCANNABLE"
    );

    assert.equal(
      result.reason,
      "ASSEMBLY_NOT_SEALED"
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "single-member SEALED assembly is insufficient for multi-evidence scan",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          member(
            "evidence-1",
            fingerprintA,
            1,
            "road_closure"
          ),
        ],
      });

    assert.equal(
      result.state,
      "INSUFFICIENT_EVIDENCE"
    );

    assert.equal(
      result.reason,
      "INSUFFICIENT_MEMBERS"
    );

    assert.equal(
      result.pairCount,
      0
    );
  }
);

test(
  "invalid fingerprint fails closed",
  () => {
    const first =
      member(
        "evidence-1",
        "invalid",
        1,
        "road_closure"
      );

    const second =
      member(
        "evidence-2",
        fingerprintB,
        2,
        "roadblock"
      );

    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          first,
          second,
        ],
      });

    assert.equal(
      result.state,
      "NOT_SCANNABLE"
    );

    assert.equal(
      result.reason,
      "INVALID_MEMBER_IDENTITY"
    );
  }
);

test(
  "gapped ordinal sequence fails closed",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
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
            3,
            "roadblock"
          ),
        ],
      });

    assert.equal(
      result.reason,
      "INVALID_MEMBER_ORDER"
    );
  }
);

test(
  "duplicate evidence identity fails closed",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          member(
            "same-evidence",
            fingerprintA,
            1,
            "road_closure"
          ),
          member(
            "same-evidence",
            fingerprintB,
            2,
            "roadblock"
          ),
        ],
      });

    assert.equal(
      result.reason,
      "DUPLICATE_MEMBER"
    );
  }
);

test(
  "two compatible positive members produce one pair and agreement",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
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

    assert.equal(
      result.state,
      "SCANNED"
    );

    assert.equal(
      result.pairCount,
      1
    );

    assert.equal(
      result.hasCanonicalConflict,
      false
    );

    assert.equal(
      result.canonicalAgreementCount,
      1
    );

    assert.equal(
      result.canonicalConflictCount,
      0
    );

    assert.equal(
      result.canonicalUnknownCount,
      3
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "three members scan every unordered pair exactly once",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          member(
            "evidence-3",
            fingerprintC,
            3,
            "roadblock"
          ),
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

    assert.equal(
      result.memberCount,
      3
    );

    assert.equal(
      result.pairCount,
      3
    );

    assert.deepEqual(
      result.pairScans.map(
        (pair) => [
          pair.firstEvidenceId,
          pair.secondEvidenceId,
        ]
      ),
      [
        [
          "evidence-1",
          "evidence-2",
        ],
        [
          "evidence-1",
          "evidence-3",
        ],
        [
          "evidence-2",
          "evidence-3",
        ],
      ]
    );
  }
);

test(
  "UNKNOWN outcomes remain unresolved rather than agreement",
  () => {
    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
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
      result.canonicalAgreementCount,
      0
    );

    assert.equal(
      result.canonicalConflictCount,
      0
    );

    assert.equal(
      result.canonicalUnknownCount,
      4
    );

    assert.equal(
      result.reason,
      "NO_CANONICAL_CONFLICT"
    );
  }
);

test(
  "explicit canonical TRUE versus FALSE surfaces assembly conflict",
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

    const result =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
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

    assert.equal(
      result.hasCanonicalConflict,
      true
    );

    assert.equal(
      result.canonicalConflictCount,
      1
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
  "assembly scan is deterministic regardless of input member ordering",
  () => {
    const first =
      member(
        "evidence-1",
        fingerprintA,
        1,
        "road_closure"
      );

    const second =
      member(
        "evidence-2",
        fingerprintB,
        2,
        "roadblock"
      );

    const forward =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          first,
          second,
        ],
      });

    const reverse =
      scanHsppEvidenceAssembly({
        assemblyId: "assembly-1",
        organizationId: "org-1",
        assemblyState: "SEALED",
        members: [
          second,
          first,
        ],
      });

    assert.deepEqual(
      forward,
      reverse
    );
  }
);