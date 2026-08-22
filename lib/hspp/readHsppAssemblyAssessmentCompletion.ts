import type { SupabaseClient } from "@supabase/supabase-js";

import { HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION } from "./recordHsppAssemblyAssessmentCompletion";

export const HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_READER_VERSION =
  "hspp-assembly-assessment-completion-reader-v1" as const;

type CompletionRow = {
  organization_id: unknown;
  assembly_id: unknown;
  completion_version: unknown;
  created_at: unknown;
};

export type ReadHsppAssemblyAssessmentCompletionInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;
};

export type HsppAssemblyAssessmentCompletion = {
  readerVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_READER_VERSION;

  completionVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION;

  organizationId: string;

  assemblyId: string;

  /**
   * Persistence provenance for the immutable completion fact only.
   *
   * This timestamp is not an assessment-time identity.
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

/**
 * B7490-07Q13d6 read-only immutable whole-Q12 completion lookup.
 *
 * The completion table stores a separate immutable fact:
 *
 *   row absent  -> no persisted whole-Q12 completion fact is known;
 *   row present -> whole-Q12 terminal completion was persisted.
 *
 * This reader deliberately does NOT:
 *
 * - reinterpret SEALED assembly state as assessment completion;
 * - discover assembly recovery work;
 * - claim or generate retry identity;
 * - execute or replay Q12;
 * - invoke the completion writer;
 * - mutate any table;
 * - generate wall-clock time;
 * - reconstruct assessment time from completion provenance;
 * - grant evidence trust or downstream authority;
 * - create API, cron, queue or scheduler execution.
 */
export async function readHsppAssemblyAssessmentCompletion({
  supabase,
  organizationId,
  assemblyId,
}: ReadHsppAssemblyAssessmentCompletionInput): Promise<HsppAssemblyAssessmentCompletion | null> {
  const normalizedOrganizationId = requireNonBlank(
    organizationId,
    "organizationId",
  );

  const normalizedAssemblyId = requireNonBlank(assemblyId, "assemblyId");

  const { data, error } = await supabase
    .from("hspp_assembly_assessment_completions")
    .select(
      [
        "organization_id",
        "assembly_id",
        "completion_version",
        "created_at",
      ].join(", "),
    )
    .eq("organization_id", normalizedOrganizationId)
    .eq("assembly_id", normalizedAssemblyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    return null;
  }

  const row = data as unknown as CompletionRow;

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
      "HSPP assembly assessment completion reader returned the wrong organization.",
    );
  }

  if (persistedAssemblyId !== normalizedAssemblyId) {
    throw new Error(
      "HSPP assembly assessment completion reader returned the wrong assembly.",
    );
  }

  if (completionVersion !== HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION) {
    throw new Error(
      "HSPP assembly assessment completion reader returned an unsupported completion version.",
    );
  }

  return {
    readerVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_READER_VERSION,

    completionVersion: HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION,

    organizationId: persistedOrganizationId,

    assemblyId: persistedAssemblyId,

    createdAt,
  };
}
