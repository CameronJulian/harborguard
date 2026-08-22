import type { SupabaseClient } from "@supabase/supabase-js";

import { HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION } from "./persistHsppCorroboratedOperationalAssessment";

import type { RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult } from "./runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting";

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION =
  "hspp-assembly-assessment-completion-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_WRITER_VERSION =
  "hspp-assembly-assessment-completion-writer-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_RPC =
  "record_hspp_assembly_assessment_completion" as const;

type CompletionRow = {
  organization_id: unknown;
  assembly_id: unknown;
  completion_version: unknown;
  created_at: unknown;
};

export type RecordHsppAssemblyAssessmentCompletionInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;

  /**
   * One already-completed Q12 invocation.
   *
   * Q13d5 does not execute or replay Q12. The caller must first run Q12,
   * then pass its returned terminal result here.
   */
  terminalResult: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult;
};

export type RecordedHsppAssemblyAssessmentCompletion = {
  writerVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_WRITER_VERSION;

  completionVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION;

  organizationId: string;

  assemblyId: string;

  /**
   * Persistence provenance for the completion row only.
   *
   * This is not assessedAt.
   */
  createdAt: string;
};

function requireNonBlank(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireTimestamp(value: unknown, fieldName: string): string {
  const timestamp = requireNonBlank(value, fieldName);

  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`${fieldName} must be a valid date-time string.`);
  }

  return timestamp;
}

function requireTerminalQ12Result(
  terminalResult: RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult,
  organizationId: string,
  assemblyId: string,
): void {
  if (!terminalResult || typeof terminalResult !== "object") {
    throw new Error("Q13d5 requires one completed terminal Q12 result.");
  }

  if (terminalResult.organizationId !== organizationId) {
    throw new Error(
      "Q13d5 terminal Q12 result belongs to the wrong organization.",
    );
  }

  if (terminalResult.assemblyId !== assemblyId) {
    throw new Error("Q13d5 terminal Q12 result belongs to the wrong assembly.");
  }

  if (terminalResult.branch === "MEMBER_CORROBORATION_DENIED") {
    if (
      terminalResult.persistenceVersion !== null ||
      terminalResult.persistenceResult !== null
    ) {
      throw new Error("Q13d5 requires the exact terminal denied Q12 result.");
    }

    return;
  }

  if (terminalResult.branch === "MEMBER_CORROBORATION_ELIGIBLE") {
    if (
      terminalResult.persistenceVersion !==
        HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION ||
      !terminalResult.persistenceResult ||
      typeof terminalResult.persistenceResult !== "object"
    ) {
      throw new Error(
        "Q13d5 requires the exact terminal eligible Q12 persistence result.",
      );
    }

    if (terminalResult.persistenceResult.organizationId !== organizationId) {
      throw new Error(
        "Q13d5 terminal Q12 persistence belongs to the wrong organization.",
      );
    }

    if (terminalResult.persistenceResult.assemblyId !== assemblyId) {
      throw new Error(
        "Q13d5 terminal Q12 persistence belongs to the wrong assembly.",
      );
    }

    return;
  }

  throw new Error("Q13d5 requires one canonical terminal Q12 branch.");
}

/**
 * B7490-07Q13d5 immutable whole-Q12 completion writer.
 *
 * This boundary accepts only one already-returned terminal Q12 result.
 *
 * It does not execute Q12. After validating the terminal result in memory,
 * it calls one narrowly privileged database RPC which records or recovers
 * the immutable Q13d4 completion fact.
 *
 * It deliberately does NOT:
 *
 * - discover recovery work;
 * - invoke Q13d2;
 * - invoke or replay Q12;
 * - generate assessedAt;
 * - read createdAt/sealedAt as assessment identity;
 * - directly access Supabase tables;
 * - update or delete a completion;
 * - mutate evidence or assembly state;
 * - grant any downstream authority;
 * - create API, cron, queue or scheduler execution.
 */
export async function recordHsppAssemblyAssessmentCompletion({
  supabase,
  organizationId,
  assemblyId,
  terminalResult,
}: RecordHsppAssemblyAssessmentCompletionInput): Promise<RecordedHsppAssemblyAssessmentCompletion> {
  const normalizedOrganizationId = requireNonBlank(
    organizationId,
    "organizationId",
  );

  const normalizedAssemblyId = requireNonBlank(assemblyId, "assemblyId");

  requireTerminalQ12Result(
    terminalResult,
    normalizedOrganizationId,
    normalizedAssemblyId,
  );

  const { data, error } = await supabase.rpc(
    HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_RPC,
    {
      p_organization_id: normalizedOrganizationId,

      p_assembly_id: normalizedAssemblyId,
    },
  );

  if (error) {
    throw error;
  }

  const rows = (data || []) as unknown as CompletionRow[];

  if (rows.length !== 1) {
    throw new Error(
      "HSPP assembly assessment completion RPC returned an invalid result.",
    );
  }

  const row = rows[0];

  const persistedOrganizationId = requireNonBlank(
    row.organization_id,
    "completion.organizationId",
  );

  const persistedAssemblyId = requireNonBlank(
    row.assembly_id,
    "completion.assemblyId",
  );

  const completionVersion = requireNonBlank(
    row.completion_version,
    "completion.completionVersion",
  );

  const createdAt = requireTimestamp(row.created_at, "completion.createdAt");

  if (persistedOrganizationId !== normalizedOrganizationId) {
    throw new Error(
      "HSPP assembly assessment completion RPC returned the wrong organization.",
    );
  }

  if (persistedAssemblyId !== normalizedAssemblyId) {
    throw new Error(
      "HSPP assembly assessment completion RPC returned the wrong assembly.",
    );
  }

  if (completionVersion !== HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION) {
    throw new Error(
      "HSPP assembly assessment completion RPC returned an unsupported completion version.",
    );
  }

  return {
    writerVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_WRITER_VERSION,

    completionVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

    organizationId: persistedOrganizationId,

    assemblyId: persistedAssemblyId,

    createdAt,
  };
}
