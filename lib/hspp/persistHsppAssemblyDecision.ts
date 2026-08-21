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

  assembly_decision_state: HsppAssemblyDecision["state"];

  assembly_decision_reason: HsppAssemblyDecision["reason"];

  member_count?: number;

  pair_count?: number;

  canonical_conflict_count?: number;

  canonical_agreement_count?: number;

  canonical_unknown_count?: number;

  has_canonical_conflict?: boolean;

  scan_summary?: unknown;

  decision_summary?: unknown;

  decided_at: string;

  authority: "NONE";
};

type HsppAssemblyDecisionLookupQuery = {
  eq(
    column:
      | "organization_id"
      | "assembly_id"
      | "assembly_scan_version"
      | "assembly_decision_policy_version",
    value: string,
  ): HsppAssemblyDecisionLookupQuery;

  maybeSingle(): Promise<{
    data: HsppAssemblyDecisionRow | null;

    error: HsppAssemblyDecisionDatabaseError | null;
  }>;
};

export type HsppAssemblyDecisionPersistenceClient = {
  from(table: "hspp_assembly_decisions"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{
          data: HsppAssemblyDecisionRow | null;

          error: HsppAssemblyDecisionDatabaseError | null;
        }>;
      };
    };

    /**
     * Required only for PostgreSQL 23505 idempotent recovery.
     *
     * Existing focused mocks that exercise only the normal INSERT
     * path may omit this read surface.
     */
    select?(columns: string): HsppAssemblyDecisionLookupQuery;
  };
};

export type PersistHsppAssemblyDecisionInput = {
  supabase: HsppAssemblyDecisionPersistenceClient;

  organizationId: string;

  assemblyId: string;

  scan: HsppAssemblyScanResult;

  decision: HsppAssemblyDecision;
};

export type HsppPersistedAssemblyDecision = {
  persistenceVersion: typeof HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION;

  id: string;

  organizationId: string;

  assemblyId: string;

  scanVersion: string;

  decisionPolicyVersion: string;

  decisionState: HsppAssemblyDecision["state"];

  decisionReason: HsppAssemblyDecision["reason"];

  decidedAt: string;

  authority: "NONE";
};

const INSERT_RETURN_COLUMNS = [
  "id",
  "organization_id",
  "assembly_id",
  "assembly_scan_version",
  "assembly_decision_policy_version",
  "assembly_decision_state",
  "assembly_decision_reason",
  "decided_at",
  "authority",
].join(",");

const IDEMPOTENT_RECOVERY_COLUMNS = [
  "id",
  "organization_id",
  "assembly_id",
  "assembly_scan_version",
  "assembly_decision_policy_version",
  "assembly_decision_state",
  "assembly_decision_reason",
  "member_count",
  "pair_count",
  "canonical_conflict_count",
  "canonical_agreement_count",
  "canonical_unknown_count",
  "has_canonical_conflict",
  "scan_summary",
  "decision_summary",
  "decided_at",
  "authority",
].join(",");

function requireIdentity(value: string, label: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `${label} is required for HSPP assembly-decision persistence.`,
    );
  }

  return normalized;
}

function databaseErrorDetail(error: HsppAssemblyDecisionDatabaseError): string {
  return (
    error.message?.trim() || error.code?.trim() || "unknown database error"
  );
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;

    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(object).sort()) {
      normalized[key] = normalizeJsonValue(object[key]);
    }

    return normalized;
  }

  return value;
}

function jsonSemanticallyEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeJsonValue(left)) ===
    JSON.stringify(normalizeJsonValue(right))
  );
}

function verifyDecisionProvenance(
  scan: HsppAssemblyScanResult,
  supplied: HsppAssemblyDecision,
): void {
  if (scan.scanVersion !== HSPP_ASSEMBLY_SCAN_VERSION) {
    throw new Error("Unsupported HSPP assembly scan version.");
  }

  if (supplied.policyVersion !== HSPP_ASSEMBLY_DECISION_VERSION) {
    throw new Error("Unsupported HSPP assembly decision policy version.");
  }

  if (scan.authority !== "NONE" || supplied.authority !== "NONE") {
    throw new Error("HSPP assembly persistence requires authority NONE.");
  }

  const expected = evaluateHsppAssemblyDecision(scan);

  const matches =
    supplied.policyVersion === expected.policyVersion &&
    supplied.state === expected.state &&
    supplied.reason === expected.reason &&
    supplied.memberCount === expected.memberCount &&
    supplied.pairCount === expected.pairCount &&
    supplied.canonicalConflictCount === expected.canonicalConflictCount &&
    supplied.canonicalAgreementCount === expected.canonicalAgreementCount &&
    supplied.canonicalUnknownCount === expected.canonicalUnknownCount &&
    supplied.authority === expected.authority;

  if (!matches) {
    throw new Error("B11D decision does not match the supplied B11C scan.");
  }
}

function verifyPersistedIdentity(
  row: HsppAssemblyDecisionRow,
  organizationId: string,
  assemblyId: string,
): void {
  if (
    !row ||
    !row.id ||
    !row.organization_id ||
    !row.assembly_id ||
    !row.decided_at
  ) {
    throw new Error(
      "HSPP assembly-decision persistence returned an invalid row.",
    );
  }

  if (
    row.organization_id !== organizationId ||
    row.assembly_id !== assemblyId
  ) {
    throw new Error(
      "Persisted HSPP assembly-decision identity does not match the request.",
    );
  }
}

function verifyPersistedCoreProvenance(
  row: HsppAssemblyDecisionRow,
  scan: HsppAssemblyScanResult,
  decision: HsppAssemblyDecision,
): void {
  if (
    row.assembly_scan_version !== scan.scanVersion ||
    row.assembly_decision_policy_version !== decision.policyVersion ||
    row.assembly_decision_state !== decision.state ||
    row.assembly_decision_reason !== decision.reason ||
    row.authority !== "NONE"
  ) {
    throw new Error(
      "Persisted HSPP assembly-decision provenance does not match the request.",
    );
  }
}

function verifyRecoveredProvenance(
  row: HsppAssemblyDecisionRow,
  organizationId: string,
  assemblyId: string,
  scan: HsppAssemblyScanResult,
  decision: HsppAssemblyDecision,
): void {
  verifyPersistedIdentity(row, organizationId, assemblyId);

  verifyPersistedCoreProvenance(row, scan, decision);

  const exact =
    row.member_count === scan.memberCount &&
    row.pair_count === scan.pairCount &&
    row.canonical_conflict_count === scan.canonicalConflictCount &&
    row.canonical_agreement_count === scan.canonicalAgreementCount &&
    row.canonical_unknown_count === scan.canonicalUnknownCount &&
    row.has_canonical_conflict === scan.hasCanonicalConflict &&
    jsonSemanticallyEqual(row.scan_summary, scan) &&
    jsonSemanticallyEqual(row.decision_summary, decision) &&
    row.authority === "NONE";

  if (!exact) {
    throw new Error(
      "Existing HSPP assembly decision conflicts with the attempted idempotent persistence provenance.",
    );
  }
}

function toPersistedResult(
  row: HsppAssemblyDecisionRow,
): HsppPersistedAssemblyDecision {
  return {
    persistenceVersion: HSPP_ASSEMBLY_DECISION_PERSISTENCE_VERSION,

    id: row.id,

    organizationId: row.organization_id,

    assemblyId: row.assembly_id,

    scanVersion: row.assembly_scan_version,

    decisionPolicyVersion: row.assembly_decision_policy_version,

    decisionState: row.assembly_decision_state,

    decisionReason: row.assembly_decision_reason,

    decidedAt: row.decided_at,

    authority: "NONE",
  };
}

/**
 * HSPP B11E2 runtime persistence boundary.
 *
 * This function appends the exact B11C scan provenance and exact
 * B11D protocol interpretation to public.hspp_assembly_decisions.
 *
 * Persistence is provenance only.
 *
 * B7490-07G3 makes this boundary logically idempotent for one
 * immutable SEALED assembly + B11C version + B11D policy version.
 *
 * The normal path remains INSERT-only.
 *
 * On PostgreSQL 23505 only, the existing organization-scoped
 * logical decision is read back and every persisted provenance field
 * is compared with the attempted scan/decision. An exact match is
 * returned as idempotent success. Any conflict fails closed.
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
  input: PersistHsppAssemblyDecisionInput,
): Promise<HsppPersistedAssemblyDecision> {
  const organizationId = requireIdentity(
    input.organizationId,
    "organizationId",
  );

  const assemblyId = requireIdentity(input.assemblyId, "assemblyId");

  verifyDecisionProvenance(input.scan, input.decision);

  const payload: Record<string, unknown> = {
    organization_id: organizationId,

    assembly_id: assemblyId,

    assembly_scan_version: input.scan.scanVersion,

    assembly_decision_policy_version: input.decision.policyVersion,

    assembly_decision_state: input.decision.state,

    assembly_decision_reason: input.decision.reason,

    member_count: input.scan.memberCount,

    pair_count: input.scan.pairCount,

    canonical_conflict_count: input.scan.canonicalConflictCount,

    canonical_agreement_count: input.scan.canonicalAgreementCount,

    canonical_unknown_count: input.scan.canonicalUnknownCount,

    has_canonical_conflict: input.scan.hasCanonicalConflict,

    scan_summary: input.scan,

    decision_summary: input.decision,

    authority: "NONE",
  };

  const { data, error } = await input.supabase
    .from("hspp_assembly_decisions")
    .insert(payload)
    .select(INSERT_RETURN_COLUMNS)
    .single();

  if (error) {
    if (error.code !== "23505") {
      throw new Error(
        "Failed to persist HSPP assembly decision: " +
          databaseErrorDetail(error),
      );
    }

    /*
     * PostgreSQL 23505 means the database UNIQUE invariant won the
     * race. Never convert that automatically into success.
     *
     * Read the tenant-scoped immutable row and prove it represents
     * exactly the same B11C/B11D provenance.
     */
    const recoveryTable = input.supabase.from("hspp_assembly_decisions");

    if (!recoveryTable.select) {
      throw new Error(
        "Failed to recover existing HSPP assembly decision after duplicate persistence.",
      );
    }

    const { data: existing, error: recoveryError } = await recoveryTable
      .select(IDEMPOTENT_RECOVERY_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("assembly_id", assemblyId)
      .eq("assembly_scan_version", input.scan.scanVersion)
      .eq("assembly_decision_policy_version", input.decision.policyVersion)
      .maybeSingle();

    if (recoveryError) {
      throw new Error(
        "Failed to recover existing HSPP assembly decision: " +
          databaseErrorDetail(recoveryError),
      );
    }

    if (!existing) {
      throw new Error(
        "Duplicate HSPP assembly decision was reported but the existing logical decision could not be found.",
      );
    }

    verifyRecoveredProvenance(
      existing,
      organizationId,
      assemblyId,
      input.scan,
      input.decision,
    );

    return toPersistedResult(existing);
  }

  if (!data) {
    throw new Error(
      "HSPP assembly-decision persistence returned an invalid row.",
    );
  }

  verifyPersistedIdentity(data, organizationId, assemblyId);

  verifyPersistedCoreProvenance(data, input.scan, input.decision);

  return toPersistedResult(data);
}
