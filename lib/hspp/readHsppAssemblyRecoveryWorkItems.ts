import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION =
  "hspp-assembly-recovery-discovery-v1" as const;

export const HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT = 100;

export type HsppAssemblyRecoveryState = "OPEN" | "SEALED";

export type ReadHsppAssemblyRecoveryWorkItemsInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyState: HsppAssemblyRecoveryState;

  limit?: number;
};

export type HsppAssemblyRecoveryWorkItem = {
  assemblyId: string;

  organizationId: string;

  assemblyVersion: string;

  membershipPolicyVersion: string;

  assemblyState: HsppAssemblyRecoveryState;

  createdAt: string;

  sealedAt: string | null;
};

export type ReadHsppAssemblyRecoveryWorkItemsResult = {
  discoveryVersion: typeof HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION;

  organizationId: string;

  assemblyState: HsppAssemblyRecoveryState;

  requestedLimit: number;

  workItems: HsppAssemblyRecoveryWorkItem[];
};

type AssemblyRecoveryRow = {
  id: unknown;

  organization_id: unknown;

  assembly_version: unknown;

  membership_policy_version: unknown;

  assembly_state: unknown;

  created_at: unknown;

  sealed_at: unknown;
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `HSPP assembly recovery discovery returned an invalid ${fieldName}.`,
    );
  }

  return value;
}

function normalizeAssemblyState(
  assemblyState: HsppAssemblyRecoveryState,
): HsppAssemblyRecoveryState {
  if (assemblyState !== "OPEN" && assemblyState !== "SEALED") {
    throw new Error("assemblyState must be OPEN or SEALED.");
  }

  return assemblyState;
}

function normalizeLimit(limit: number | undefined): number {
  const normalized = limit ?? HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT;

  if (
    !Number.isInteger(normalized) ||
    normalized <= 0 ||
    normalized > HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT}.`,
    );
  }

  return normalized;
}

/**
 * B7490-07Q13b bounded persisted assembly recovery-discovery boundary.
 *
 * This reader discovers one caller-selected persisted assembly lifecycle
 * state for one organization using deterministic created_at + id ordering.
 *
 * It deliberately exposes only persisted assembly-level identity and
 * lifecycle provenance.
 *
 * It does NOT:
 *
 * - read assembly members;
 * - rerun Reservoir discovery or reevaluation;
 * - evaluate or alter assembly membership;
 * - create or persist an assembly;
 * - seal an assembly;
 * - scan a sealed assembly;
 * - evaluate or persist corroboration;
 * - invoke Q12 or any operational-assessment runner;
 * - generate assessment retry identity;
 * - reinterpret created_at or sealed_at as assessment time;
 * - infer downstream processing status from SEALED;
 * - modify evidence trust or validation;
 * - grant Route Safety, Crowd Intelligence, training, or validation authority;
 * - create API, UI, cron, queue, retry, or scheduler execution.
 */
export async function readHsppAssemblyRecoveryWorkItems({
  supabase,
  organizationId,
  assemblyState,
  limit,
}: ReadHsppAssemblyRecoveryWorkItemsInput): Promise<ReadHsppAssemblyRecoveryWorkItemsResult> {
  const normalizedOrganizationId = requireNonBlank(
    organizationId,
    "organizationId",
  );

  const normalizedAssemblyState = normalizeAssemblyState(assemblyState);

  const requestedLimit = normalizeLimit(limit);

  const { data, error } = await supabase
    .from("hspp_evidence_assemblies")
    .select(
      [
        "id",
        "organization_id",
        "assembly_version",
        "membership_policy_version",
        "assembly_state",
        "created_at",
        "sealed_at",
      ].join(", "),
    )
    .eq("organization_id", normalizedOrganizationId)
    .eq("assembly_state", normalizedAssemblyState)
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    })
    .limit(requestedLimit);

  if (error) {
    throw error;
  }

  /*
   * Supabase cannot statically infer a concrete row shape from the dynamic
   * joined select string above, so cross the untyped database boundary once
   * and validate every persisted field below before exposing a work item.
   */
  const rows = (data || []) as unknown as AssemblyRecoveryRow[];

  const workItems: HsppAssemblyRecoveryWorkItem[] = rows.map(
    (row): HsppAssemblyRecoveryWorkItem => {
      const assemblyId = requireString(row.id, "assembly id");

      const persistedOrganizationId = requireString(
        row.organization_id,
        "organization id",
      );

      const assemblyVersion = requireString(
        row.assembly_version,
        "assembly version",
      );

      const membershipPolicyVersion = requireString(
        row.membership_policy_version,
        "membership policy version",
      );

      const persistedAssemblyState = requireString(
        row.assembly_state,
        "assembly state",
      );

      const createdAt = requireString(row.created_at, "created_at");

      const sealedAt =
        row.sealed_at === null
          ? null
          : requireString(row.sealed_at, "sealed_at");

      if (persistedOrganizationId !== normalizedOrganizationId) {
        throw new Error(
          "HSPP assembly recovery discovery returned an assembly for the wrong organization.",
        );
      }

      if (
        persistedAssemblyState !== "OPEN" &&
        persistedAssemblyState !== "SEALED"
      ) {
        throw new Error(
          "HSPP assembly recovery discovery returned an unsupported assembly state.",
        );
      }

      if (persistedAssemblyState !== normalizedAssemblyState) {
        throw new Error(
          "HSPP assembly recovery discovery returned an assembly outside the requested state.",
        );
      }

      if (persistedAssemblyState === "OPEN" && sealedAt !== null) {
        throw new Error(
          "OPEN HSPP assembly recovery work must not contain sealed_at.",
        );
      }

      if (persistedAssemblyState === "SEALED" && sealedAt === null) {
        throw new Error(
          "SEALED HSPP assembly recovery work requires sealed_at.",
        );
      }

      return {
        assemblyId,

        organizationId: persistedOrganizationId,

        assemblyVersion,

        membershipPolicyVersion,

        assemblyState: persistedAssemblyState,

        createdAt,

        sealedAt,
      };
    },
  );

  return {
    discoveryVersion: HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION,

    organizationId: normalizedOrganizationId,

    assemblyState: normalizedAssemblyState,

    requestedLimit,

    workItems,
  };
}
