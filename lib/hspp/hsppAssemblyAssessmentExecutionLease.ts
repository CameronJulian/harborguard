import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION =
  "hspp-assembly-assessment-execution-lease-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION =
  "hspp-assembly-assessment-execution-lease-acquire-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_VERSION =
  "hspp-assembly-assessment-execution-lease-renew-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_VERSION =
  "hspp-assembly-assessment-execution-lease-release-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC =
  "acquire_hspp_assembly_assessment_execution_lease" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_RPC =
  "renew_hspp_assembly_assessment_execution_lease" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_RPC =
  "release_hspp_assembly_assessment_execution_lease" as const;

export type HsppAssemblyAssessmentExecutionLeaseAcquire =
  | {
      operationVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION;
      leaseVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION;
      state: "ACQUIRED";
      organizationId: string;
      assemblyId: string;
      leaseToken: string;
      acquiredAt: string;
      renewedAt: string;
      expiresAt: string;
    }
  | {
      operationVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION;
      leaseVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION;
      state: "BUSY";
      organizationId: string;
      assemblyId: string;
      leaseToken: null;
      acquiredAt: string;
      renewedAt: string;
      expiresAt: string;
    }
  | {
      operationVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION;

      leaseVersion:
        typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION;

      state:
        "CONTENDED";

      organizationId:
        string;

      assemblyId:
        string;

      leaseToken:
        null;

      acquiredAt:
        null;

      renewedAt:
        null;

      expiresAt:
        null;
    };

export type HsppAssemblyAssessmentExecutionLeaseRenew = {
  operationVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_VERSION;
  leaseVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION;
  state: "RENEWED" | "LOST" | "CONTENDED";
  organizationId: string;
  assemblyId: string;
  leaseToken: string;
  expiresAt: string | null;
};

export type HsppAssemblyAssessmentExecutionLeaseRelease = {
  operationVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_VERSION;
  leaseVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION;
  state: "RELEASED" | "NOT_OWNER";
  organizationId: string;
  assemblyId: string;
  leaseToken: string;
};

type AcquireRow = {
  acquire_state?: unknown;
  returned_lease_token?: unknown;
  lease_acquired_at?: unknown;
  lease_renewed_at?: unknown;
  lease_expires_at?: unknown;
};

type RenewRow = {
  renew_state?: unknown;
  lease_expires_at?: unknown;
};

type ReleaseRow = {
  release_state?: unknown;
};

function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireLeaseSeconds(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 3600
  ) {
    throw new Error(
      "leaseSeconds must be an integer between 1 and 3600.",
    );
  }

  return value;
}

function singleRow<T>(
  data: unknown,
  boundaryName: string,
): T {
  if (
    !Array.isArray(data) ||
    data.length !== 1 ||
    !data[0] ||
    typeof data[0] !== "object"
  ) {
    throw new Error(
      `${boundaryName} returned an invalid result.`,
    );
  }

  return data[0] as T;
}

function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(
      `${fieldName} must be a valid persisted date-time string.`,
    );
  }

  return value;
}

export async function acquireHsppAssemblyAssessmentExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  leaseSeconds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
  leaseToken: string;
  leaseSeconds: number;
}): Promise<HsppAssemblyAssessmentExecutionLeaseAcquire> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireNonBlank(
      assemblyId,
      "assemblyId",
    );

  const normalizedLeaseToken =
    requireNonBlank(
      leaseToken,
      "leaseToken",
    );

  const normalizedLeaseSeconds =
    requireLeaseSeconds(
      leaseSeconds,
    );

  const { data, error } =
    await supabase.rpc(
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_assembly_id:
          normalizedAssemblyId,

        p_lease_token:
          normalizedLeaseToken,

        p_lease_seconds:
          normalizedLeaseSeconds,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    singleRow<AcquireRow>(
      data,
      "HSPP assessment execution lease acquire",
    );

  if (
    row.acquire_state !== "ACQUIRED" &&
    row.acquire_state !== "BUSY" &&
    row.acquire_state !== "CONTENDED"
  ) {
    throw new Error(
      "HSPP assessment execution lease acquire returned an invalid state.",
    );
  }

  if (row.acquire_state === "CONTENDED") {
    if (
      row.returned_lease_token !== null ||
      row.lease_acquired_at !== null ||
      row.lease_renewed_at !== null ||
      row.lease_expires_at !== null
    ) {
      throw new Error(
        "CONTENDED HSPP execution lease must not expose lease ownership metadata.",
      );
    }

    return {
      operationVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION,

      leaseVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

      state:
        "CONTENDED",

      organizationId:
        normalizedOrganizationId,

      assemblyId:
        normalizedAssemblyId,

      leaseToken:
        null,

      acquiredAt:
        null,

      renewedAt:
        null,

      expiresAt:
        null,
    };
  }

  const acquiredAt =
    requireTimestamp(
      row.lease_acquired_at,
      "lease_acquired_at",
    );

  const renewedAt =
    requireTimestamp(
      row.lease_renewed_at,
      "lease_renewed_at",
    );

  const expiresAt =
    requireTimestamp(
      row.lease_expires_at,
      "lease_expires_at",
    );

  if (row.acquire_state === "BUSY") {
    if (row.returned_lease_token !== null) {
      throw new Error(
        "BUSY HSPP execution lease must not expose the current owner token.",
      );
    }

    return {
      operationVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION,

      leaseVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

      state:
        "BUSY",

      organizationId:
        normalizedOrganizationId,

      assemblyId:
        normalizedAssemblyId,

      leaseToken:
        null,

      acquiredAt,
      renewedAt,
      expiresAt,
    };
  }

  if (
    typeof row.returned_lease_token !==
      "string" ||
    row.returned_lease_token !==
      normalizedLeaseToken
  ) {
    throw new Error(
      "ACQUIRED HSPP execution lease did not return the exact caller-owned token.",
    );
  }

  return {
    operationVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_ACQUIRE_VERSION,

    leaseVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

    state:
      "ACQUIRED",

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    leaseToken:
      normalizedLeaseToken,

    acquiredAt,
    renewedAt,
    expiresAt,
  };
}

export async function renewHsppAssemblyAssessmentExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  leaseSeconds,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
  leaseToken: string;
  leaseSeconds: number;
}): Promise<HsppAssemblyAssessmentExecutionLeaseRenew> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireNonBlank(
      assemblyId,
      "assemblyId",
    );

  const normalizedLeaseToken =
    requireNonBlank(
      leaseToken,
      "leaseToken",
    );

  const normalizedLeaseSeconds =
    requireLeaseSeconds(
      leaseSeconds,
    );

  const { data, error } =
    await supabase.rpc(
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_assembly_id:
          normalizedAssemblyId,

        p_lease_token:
          normalizedLeaseToken,

        p_lease_seconds:
          normalizedLeaseSeconds,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    singleRow<RenewRow>(
      data,
      "HSPP assessment execution lease renew",
    );

  if (
    row.renew_state !== "RENEWED" &&
    row.renew_state !== "LOST" &&
    row.renew_state !== "CONTENDED"
  ) {
    throw new Error(
      "HSPP assessment execution lease renew returned an invalid state.",
    );
  }

  if (row.renew_state === "CONTENDED") {
    if (row.lease_expires_at !== null) {
      throw new Error(
        "CONTENDED HSPP execution lease renew must not expose an expiry.",
      );
    }

    return {
      operationVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_VERSION,

      leaseVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

      state:
        "CONTENDED",

      organizationId:
        normalizedOrganizationId,

      assemblyId:
        normalizedAssemblyId,

      leaseToken:
        normalizedLeaseToken,

      expiresAt:
        null,
    };
  }
  if (row.renew_state === "LOST") {
    if (row.lease_expires_at !== null) {
      throw new Error(
        "LOST HSPP execution lease must not expose an expiry owned by another execution.",
      );
    }

    return {
      operationVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_VERSION,

      leaseVersion:
        HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

      state:
        "LOST",

      organizationId:
        normalizedOrganizationId,

      assemblyId:
        normalizedAssemblyId,

      leaseToken:
        normalizedLeaseToken,

      expiresAt:
        null,
    };
  }

  return {
    operationVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RENEW_VERSION,

    leaseVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

    state:
      "RENEWED",

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    leaseToken:
      normalizedLeaseToken,

    expiresAt:
      requireTimestamp(
        row.lease_expires_at,
        "lease_expires_at",
      ),
  };
}

export async function releaseHsppAssemblyAssessmentExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  assemblyId: string;
  leaseToken: string;
}): Promise<HsppAssemblyAssessmentExecutionLeaseRelease> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireNonBlank(
      assemblyId,
      "assemblyId",
    );

  const normalizedLeaseToken =
    requireNonBlank(
      leaseToken,
      "leaseToken",
    );

  const { data, error } =
    await supabase.rpc(
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_assembly_id:
          normalizedAssemblyId,

        p_lease_token:
          normalizedLeaseToken,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    singleRow<ReleaseRow>(
      data,
      "HSPP assessment execution lease release",
    );

  if (
    row.release_state !== "RELEASED" &&
    row.release_state !== "NOT_OWNER"
  ) {
    throw new Error(
      "HSPP assessment execution lease release returned an invalid state.",
    );
  }

  return {
    operationVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_RELEASE_VERSION,

    leaseVersion:
      HSPP_ASSEMBLY_ASSESSMENT_EXECUTION_LEASE_VERSION,

    state:
      row.release_state,

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    leaseToken:
      normalizedLeaseToken,
  };
}
