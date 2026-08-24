import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const here =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const sourcePath =
  path.resolve(
    here,
    "../lib/hspp/readHsppReconstructionIntentReplacementCandidate.ts",
  );

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );

const executableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/.*$/gm,
      "",
    );


test(
  "Q14ag31H defines the isolated exact durable replacement reader",
  () => {
    assert.match(
      source,
      /hspp-reconstruction-intent-replacement-candidate-reader-v1/,
    );

    assert.match(
      source,
      /export\s+async\s+function\s+readHsppReconstructionIntentReplacementCandidate\s*\(/,
    );
  },
);


test(
  "Q14ag31H uses the existing exact operational evidence reader",
  () => {
    assert.match(
      executableSource,
      /readHsppEvidenceForOperationalUse\s*\(\s*\{[\s\S]*?organizationId[\s\S]*?evidenceId\s*:\s*replacementEvidenceId[\s\S]*?\}\s*\)/,
    );

    assert.doesNotMatch(
      executableSource,
      /\breadHsppEvidenceBatchForOperationalUse\s*\(/,
    );
  },
);


test(
  "Q14ag31H classifies only the exact durable replacement evidence id",
  () => {
    assert.match(
      executableSource,
      /"read_hspp_evidence_assembly_membership_classifications"/,
    );

    assert.match(
      executableSource,
      /p_organization_id\s*:\s*organizationId/,
    );

    assert.match(
      executableSource,
      /p_evidence_ids\s*:\s*\[\s*replacementEvidenceId\s*,?\s*\]/,
    );

    assert.match(
      executableSource,
      /membershipClassificationRows\.length\s*!==\s*1/,
    );
  },
);


test(
  "Q14ag31H requires exact NEVER_ASSEMBLED lifecycle state",
  () => {
    assert.match(
      executableSource,
      /has_historical_membership/,
    );

    assert.match(
      executableSource,
      /has_current_effective_membership/,
    );

    assert.match(
      executableSource,
      /"NEVER_ASSEMBLED"/,
    );

    assert.match(
      executableSource,
      /expectedMembershipClassification/,
    );
  },
);


test(
  "Q14ag31H reuses B06A Reservoir eligibility",
  () => {
    assert.match(
      executableSource,
      /\bevaluateHsppReservoirEligibility\s*\(/,
    );

    assert.match(
      executableSource,
      /operationalUseDecision\s*:\s*operationalRead\.decision/,
    );

    assert.match(
      executableSource,
      /if\s*\(\s*!reservoirDecision\.eligible\s*\)/,
    );
  },
);


test(
  "Q14ag31H binds immutable evidence identity organization and fingerprint",
  () => {
    assert.match(
      executableSource,
      /replacementEvidenceIntegrityFingerprint/,
    );

    assert.match(
      executableSource,
      /\^\[0-9a-f\]\{64\}\$/,
    );

    assert.match(
      executableSource,
      /persistedEvidenceId\s*!==\s*replacementEvidenceId/,
    );

    assert.match(
      executableSource,
      /persistedFingerprint\s*!==\s*authorizedFingerprint/,
    );

    assert.match(
      executableSource,
      /persistedOrganizationId\s*!==\s*organizationId/,
    );
  },
);


test(
  "Q14ag31H requires the durable discovery policy to match B06B",
  () => {
    assert.match(
      executableSource,
      /\bHSPP_RESERVOIR_DISCOVERY_POLICY_VERSION\b/,
    );

    assert.match(
      executableSource,
      /discoveryPolicyVersion\s*!==\s*HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/,
    );
  },
);


test(
  "Q14ag31H returns one validated HsppReservoirCandidate",
  () => {
    assert.match(
      source,
      /type\s+HsppReservoirCandidate/,
    );

    assert.match(
      executableSource,
      /membershipClassification\s*:\s*"NEVER_ASSEMBLED"/,
    );

    assert.match(
      executableSource,
      /operationalRead/,
    );

    assert.match(
      executableSource,
      /hasAssemblyMembership/,
    );

    assert.match(
      executableSource,
      /reservoirDecision/,
    );
  },
);


test(
  "Q14ag31H never invokes mutable Reservoir discovery or pair reevaluation",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\breadHsppReservoirCandidates\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bevaluateHsppReservoirReevaluation\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\brunHsppReservoirReevaluation\s*\(/,
    );
  },
);


test(
  "Q14ag31H does not claim reconstruct seal assess schedule or mutate",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\bclaimHsppReconstructionExecutionIntent\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\brunHsppReservoirReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\bpersistHsppEvidenceAssemblyReconstruction\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\brandomUUID\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\.(?:insert|update|delete|upsert)\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /\b[a-z0-9_]*(?:seal|assessment|scheduler|cron|queue)[a-z0-9_]*\s*\(/i,
    );
  },
);
