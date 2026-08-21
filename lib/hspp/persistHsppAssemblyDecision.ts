import {
  HSPP_ASSEMBLY_SCAN_VERSION,
  type HsppAssemblyScanResult,
} from "./scanHsppEvidenceAssembly";

import {
  HSPP_ASSEMBLY_DECISION_VERSION,
  evaluateHsppAssemblyDecision,
  type HsppAssemblyDecision,
} from "./evaluateHsppAssemblyDecision";

export const HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION =
  "hspp-assembly-decision-persistence-v1" as const;

type HsppAssemblyDecisionDatabaseError = {
  message?: string;
  code?: string;
};

type HsppAssemblyDecisionRow = {
  id: string;
  organization_id: string;
  assembly_id: string;
  assembly_scan_version: string;
  assembly_decision_policy_version: string;
  assembly_decision_state:
    HsppAssemblyDecision["state"];
  assembly_decision_reason:
    HsppAssemblyDecision["reason"];
  decided_at: string;
  authority: "NONE";
};

export type HsppAssemblyDecisionPersistenceClient = {
  from:
    (
      table:
        "hspp_assembly_decisions"
    ) => {
      insert:
        (
          values:
            Record<string, unknown>
        ) => {
          select:
            (
              columns: string
            ) => {
              single:
                () =>
                  Promise<{
                    data:
                      HsppAssemblyDecisionRow |
                      null;
                    error:
                      HsppAssemblyDecisionDatabaseError |
                      null;
                  }>;
            };
        };
    };
};

export type PersistHsppAssemblyDecisionInput = {
  supabase:
    HsppAssemblyDecisionPersistenceClient;

  organizationId:
    string;

  assemblyId:
    string;

  scan:
    HsppAssemblyScanResult;

  decision:
    HsppAssemblyDecision;
};

export type HsppPersistedAssemblyDecision = {
  persistenceVersion:
    typeof HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION;

  id:
    string;

  organizationId:
    string;

  assemblyId:
    string;

  scanVersion:
    string;

  decisionPolicyVersion:
    string;

  decisionState:
    HsppAssemblyDecision["state"];

  decisionReason:
    HsppAssemblyDecision["reason"];

  decidedAt:
    string;

  authority:
    "NONE";
};

function requireIdentity(
  value: string,
  label: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${label} is required for HSPP assembly-decision persistence.`
    );
  }

  return normalized;
}

function verifyDecisionProvenance(
  scan:
    HsppAssemblyScanResult,
  supplied:
    HsppAssemblyDecision
): void {
  if (
    scan.scanVersion !==
    HSPP_ASSEMBLY_SCAN_VERSION
  ) {
    throw new Error(
      "Unsupported HSPP assembly scan version."
    );
  }

  if (
    supplied.policyVersion !==
    HSPP_ASSEMBLY_DECISION_VERSION
  ) {
    throw new Error(
      "Unsupported HSPP assembly decision policy version."
    );
  }

  if (
    scan.authority !== "NONE" ||
    supplied.authority !== "NONE"
  ) {
    throw new Error(
      "HSPP assembly persistence requires authority NONE."
    );
  }

  const expected =
    evaluateHsppAssemblyDecision(
      scan
    );

  const matches =
    supplied.policyVersion ===
      expected.policyVersion &&
    supplied.state ===
      expected.state &&
    supplied.reason ===
      expected.reason &&
    supplied.memberCount ===
      expected.memberCount &&
    supplied.pairCount ===
      expected.pairCount &&
    supplied.canonicalConflictCount ===
      expected.canonicalConflictCount &&
    supplied.canonicalAgreementCount ===
      expected.canonicalAgreementCount &&
    supplied.canonicalUnknownCount ===
      expected.canonicalUnknownCount &&
    supplied.authority ===
      expected.authority;

  if (!matches) {
    throw new Error(
      "B11D decision does not match the supplied B11C scan."
    );
  }
}

/**
 * HSPP B11E2 runtime persistence boundary.
 *
 * This function appends the exact B11C scan provenance and exact
 * B11D protocol interpretation to public.hspp_assembly_decisions.
 *
 * Persistence is provenance only.
 *
 * It does not:
 *
 * - mutate the evidence assembly;
 * - mutate HSPP evidence;
 * - promote trustState;
 * - change validationState;
 * - grant operational eligibility;
 * - grant Crowd eligibility;
 * - grant ML training eligibility;
 * - grant validation eligibility;
 * - establish physical-world truth;
 * - establish CORROBORATED or VERIFIED trust.
 *
 * The B11E1 database schema independently prevents UPDATE and DELETE
 * of persisted assembly-decision records.
 */
export async function persistHsppAssemblyDecision(
  input:
    PersistHsppAssemblyDecisionInput
): Promise<HsppPersistedAssemblyDecision> {
  const organizationId =
    requireIdentity(
      input.organizationId,
      "organizationId"
    );

  const assemblyId =
    requireIdentity(
      input.assemblyId,
      "assemblyId"
    );

  verifyDecisionProvenance(
    input.scan,
    input.decision
  );

  const payload:
    Record<string, unknown> = {
      organization_id:
        organizationId,

      assembly_id:
        assemblyId,

      assembly_scan_version:
        input.scan.scanVersion,

      assembly_decision_policy_version:
        input.decision.policyVersion,

      assembly_decision_state:
        input.decision.state,

      assembly_decision_reason:
        input.decision.reason,

      member_count:
        input.scan.memberCount,

      pair_count:
        input.scan.pairCount,

      canonical_conflict_count:
        input.scan.canonicalConflictCount,

      canonical_agreement_count:
        input.scan.canonicalAgreementCount,

      canonical_unknown_count:
        input.scan.canonicalUnknownCount,

      has_canonical_conflict:
        input.scan.hasCanonicalConflict,

      scan_summary:
        input.scan,

      decision_summary:
        input.decision,

      authority:
        "NONE",
    };

  const {
    data,
    error,
  } =
    await input.supabase
      .from(
        "hspp_assembly_decisions"
      )
      .insert(
        payload
      )
      .select(
        [
          "id",
          "organization_id",
          "assembly_id",
          "assembly_scan_version",
          "assembly_decision_policy_version",
          "assembly_decision_state",
          "assembly_decision_reason",
          "decided_at",
          "authority",
        ].join(",")
      )
      .single();

  if (error) {
    const detail =
      error.message?.trim() ||
      error.code?.trim() ||
      "unknown database error";

    throw new Error(
      "Failed to persist HSPP assembly decision: " +
      detail
    );
  }

  if (
    !data ||
    !data.id ||
    !data.organization_id ||
    !data.assembly_id ||
    !data.decided_at
  ) {
    throw new Error(
      "HSPP assembly-decision persistence returned an invalid row."
    );
  }

  if (
    data.organization_id !==
      organizationId ||
    data.assembly_id !==
      assemblyId
  ) {
    throw new Error(
      "Persisted HSPP assembly-decision identity does not match the request."
    );
  }

  if (
    data.assembly_scan_version !==
      input.scan.scanVersion ||
    data.assembly_decision_policy_version !==
      input.decision.policyVersion ||
    data.assembly_decision_state !==
      input.decision.state ||
    data.assembly_decision_reason !==
      input.decision.reason ||
    data.authority !== "NONE"
  ) {
    throw new Error(
      "Persisted HSPP assembly-decision provenance does not match the request."
    );
  }

  return {
    persistenceVersion:
      HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,

    id:
      data.id,

    organizationId:
      data.organization_id,

    assemblyId:
      data.assembly_id,

    scanVersion:
      data.assembly_scan_version,

    decisionPolicyVersion:
      data.assembly_decision_policy_version,

    decisionState:
      data.assembly_decision_state,

    decisionReason:
      data.assembly_decision_reason,

    decidedAt:
      data.decided_at,

    authority:
      "NONE",
  };
}