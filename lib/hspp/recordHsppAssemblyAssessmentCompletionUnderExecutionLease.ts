import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,
} from "./recordHsppAssemblyAssessmentCompletion";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION,
} from "./persistHsppCorroboratedOperationalAssessment";

import type {
  RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult,
} from "./runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting";

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_WRITER_VERSION =
  "hspp-assembly-assessment-completion-under-execution-lease-writer-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_RPC =
  "record_hspp_assembly_assessment_completion_with_lease" as const;

type CompletionRow = {
  organization_id: unknown;
  assembly_id: unknown;
  completion_version: unknown;
  created_at: unknown;
};

export type RecordHsppAssemblyAssessmentCompletionUnderExecutionLeaseInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;

  /**
   * Caller-owned Q13e3 execution ownership identity.
   *
   * This function never acquires, renews, releases or generates the token.
   */
  leaseToken: string;

  /**
   * One already-returned terminal Q12 result.
   *
   * As with Q13d5, this in-memory contract proves that the caller reached
   * a canonical terminal Q12 result before attempting completion.
   *
   * PostgreSQL independently proves the durable assembly / lease /
   * retry-identity prerequisites.
   */
  terminalResult:
    RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult;
};

export type RecordedHsppAssemblyAssessmentCompletionUnderExecutionLease = {
  writerVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_WRITER_VERSION;

  completionVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION;

  organizationId: string;

  assemblyId: string;

  /**
   * Q13d4 completion-row persistence provenance only.
   *
   * This is never assessedAt.
   */
  createdAt: string;
};

function requireNonBlank(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return value.trim();
}

function requireUuid(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName
    );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      normalized
    )
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`
    );
  }

  return normalized.toLowerCase();
}

function requireTimestamp(
  value: unknown,
  fieldName: string
): string {
  const timestamp =
    requireNonBlank(
      value,
      fieldName
    );

  if (
    !Number.isFinite(
      Date.parse(
        timestamp
      )
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date-time string.`
    );
  }

  return timestamp;
}

function requireTerminalQ12Result(
  terminalResult:
    RunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRoutingResult,
  organizationId: string,
  assemblyId: string
): void {
  if (
    !terminalResult ||
    typeof terminalResult !== "object"
  ) {
    throw new Error(
      "Q13e5b requires one completed terminal Q12 result."
    );
  }

  if (
    terminalResult.organizationId !==
      organizationId
  ) {
    throw new Error(
      "Q13e5b terminal Q12 result belongs to the wrong organization."
    );
  }

  if (
    terminalResult.assemblyId !==
      assemblyId
  ) {
    throw new Error(
      "Q13e5b terminal Q12 result belongs to the wrong assembly."
    );
  }

  if (
    terminalResult.branch ===
      "MEMBER_CORROBORATION_DENIED"
  ) {
    if (
      terminalResult.persistenceVersion !== null ||
      terminalResult.persistenceResult !== null
    ) {
      throw new Error(
        "Q13e5b requires the exact terminal denied Q12 result."
      );
    }

    return;
  }

  if (
    terminalResult.branch ===
      "MEMBER_CORROBORATION_ELIGIBLE"
  ) {
    if (
      terminalResult.persistenceVersion !==
        HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION ||
      !terminalResult.persistenceResult ||
      typeof terminalResult.persistenceResult !== "object"
    ) {
      throw new Error(
        "Q13e5b requires the exact terminal eligible Q12 persistence result."
      );
    }

    if (
      terminalResult.persistenceResult.organizationId !==
        organizationId
    ) {
      throw new Error(
        "Q13e5b terminal Q12 persistence belongs to the wrong organization."
      );
    }

    if (
      terminalResult.persistenceResult.assemblyId !==
        assemblyId
    ) {
      throw new Error(
        "Q13e5b terminal Q12 persistence belongs to the wrong assembly."
      );
    }

    return;
  }

  throw new Error(
    "Q13e5b requires one canonical terminal Q12 branch."
  );
}

/**
 * B7490-07Q13e5b recovery-only token-fenced immutable completion writer.
 *
 * This boundary mirrors Q13d5's in-memory terminal-Q12 validation but calls
 * a separate database RPC which additionally requires current execution-lease
 * ownership.
 *
 * It deliberately does NOT:
 *
 * - execute or replay Q12;
 * - call the existing Q13d5 writer;
 * - acquire, renew or release a lease;
 * - generate a lease token;
 * - generate assessedAt;
 * - read createdAt as assessment identity;
 * - directly access Supabase tables;
 * - update/delete completion;
 * - mutate evidence or assembly state;
 * - create API/cron/queue/scheduler wiring.
 */
export async function recordHsppAssemblyAssessmentCompletionUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  terminalResult,
}: RecordHsppAssemblyAssessmentCompletionUnderExecutionLeaseInput): Promise<RecordedHsppAssemblyAssessmentCompletionUnderExecutionLease> {
  const normalizedOrganizationId =
    requireUuid(
      organizationId,
      "organizationId"
    );

  const normalizedAssemblyId =
    requireUuid(
      assemblyId,
      "assemblyId"
    );

  const normalizedLeaseToken =
    requireUuid(
      leaseToken,
      "leaseToken"
    );

  requireTerminalQ12Result(
    terminalResult,
    normalizedOrganizationId,
    normalizedAssemblyId
  );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_assembly_id:
          normalizedAssemblyId,

        p_lease_token:
          normalizedLeaseToken,
      }
    );

  if (error) {
    throw error;
  }

  const rows =
    (data || []) as unknown as CompletionRow[];

  if (
    rows.length !== 1
  ) {
    throw new Error(
      "Fenced HSPP assembly assessment completion RPC returned an invalid result."
    );
  }

  const row =
    rows[0];

  const persistedOrganizationId =
    requireUuid(
      row.organization_id,
      "completion.organizationId"
    );

  const persistedAssemblyId =
    requireUuid(
      row.assembly_id,
      "completion.assemblyId"
    );

  const completionVersion =
    requireNonBlank(
      row.completion_version,
      "completion.completionVersion"
    );

  const createdAt =
    requireTimestamp(
      row.created_at,
      "completion.createdAt"
    );

  if (
    persistedOrganizationId !==
      normalizedOrganizationId
  ) {
    throw new Error(
      "Fenced HSPP assembly assessment completion RPC returned the wrong organization."
    );
  }

  if (
    persistedAssemblyId !==
      normalizedAssemblyId
  ) {
    throw new Error(
      "Fenced HSPP assembly assessment completion RPC returned the wrong assembly."
    );
  }

  if (
    completionVersion !==
      HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION
  ) {
    throw new Error(
      "Fenced HSPP assembly assessment completion RPC returned an unsupported completion version."
    );
  }

  return {
    writerVersion:
      HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_UNDER_EXECUTION_LEASE_WRITER_VERSION,

    completionVersion:
      HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

    organizationId:
      persistedOrganizationId,

    assemblyId:
      persistedAssemblyId,

    createdAt,
  };
}
