import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  assessVehicleLocationArchivePruningEligibility,
  type VehicleLocationArchivePruningIneligibleReason,
} from "@/lib/fleet/assessVehicleLocationArchivePruningEligibility";


const ARCHIVE_MANIFEST_TABLE =
  "vehicle_location_archive_manifests" as const;

export const VEHICLE_LOCATION_ARCHIVE_PRUNE_RPC =
  "prune_vehicle_locations_for_verified_archive" as const;


type DurablePruneStateRow = {
  id:
    string;

  pruned_at:
    string | null;
};


type PruneRpcRow = {
  manifest_id:
    unknown;

  deleted_row_count:
    unknown;
};


export type ExecuteVehicleLocationArchivePruneInput = {
  supabase:
    SupabaseClient;

  manifestId:
    string;

  pageSize?:
    number;
};


export type ExecuteVehicleLocationArchivePruneResult =
  | {
      executed:
        false;

      manifestId:
        string;

      reason:
        VehicleLocationArchivePruningIneligibleReason;
    }
  | {
      executed:
        true;

      manifestId:
        string;

      deletedRowCount:
        number;

      durableRetry:
        boolean;
    };


function requireManifestId(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Vehicle location archive manifest id is required."
    );
  }

  return normalized;
}


function parseDeletedRowCount(
  value:
    unknown
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}


function requireExactRpcRow(
  data:
    unknown,
  manifestId:
    string
): {
  manifestId:
    string;

  deletedRowCount:
    number;
} {
  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "Vehicle location archive prune RPC must return exactly one row."
    );
  }

  const row =
    data[0] as PruneRpcRow | null;

  if (
    !row ||
    typeof row !== "object"
  ) {
    throw new Error(
      "Vehicle location archive prune RPC returned an invalid row."
    );
  }

  if (
    typeof row.manifest_id !== "string" ||
    row.manifest_id !== manifestId
  ) {
    throw new Error(
      "Vehicle location archive prune RPC returned the wrong manifest."
    );
  }

  const deletedRowCount =
    parseDeletedRowCount(
      row.deleted_row_count
    );

  if (deletedRowCount === null) {
    throw new Error(
      "Vehicle location archive prune RPC returned an invalid deleted row count."
    );
  }

  return {
    manifestId:
      row.manifest_id,

    deletedRowCount,
  };
}


async function invokePruneRpc({
  supabase,
  manifestId,
}: {
  supabase:
    SupabaseClient;

  manifestId:
    string;
}) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      VEHICLE_LOCATION_ARCHIVE_PRUNE_RPC,
      {
        p_manifest_id:
          manifestId,
      }
    );

  if (error) {
    throw error;
  }

  return requireExactRpcRow(
    data,
    manifestId
  );
}


/**
 * Executes one explicit vehicle-location archive prune.
 *
 * Boundaries:
 *
 * - The caller must supply the Supabase client explicitly.
 * - This helper owns no scheduling or retention policy.
 * - It never chooses a manifest automatically.
 * - An unpruned manifest must pass the established independent
 *   archive-object and live-evidence eligibility assessment.
 * - A manifest carrying durable pruned_at evidence bypasses live-evidence
 *   reconstruction so the database's exact durable retry path remains
 *   reachable after hot telemetry has intentionally been removed.
 * - The database RPC remains authoritative for destructive execution,
 *   concurrency control, durable completion evidence and exact retries.
 * - This helper creates no cron, route, background worker or automatic
 *   production execution path.
 */
export async function executeVehicleLocationArchivePrune(
  input:
    ExecuteVehicleLocationArchivePruneInput
): Promise<
  ExecuteVehicleLocationArchivePruneResult
> {
  const manifestId =
    requireManifestId(
      input.manifestId
    );

  const {
    data: durableState,
    error: durableStateError,
  } =
    await input.supabase
      .from(
        ARCHIVE_MANIFEST_TABLE
      )
      .select(
        "id,pruned_at"
      )
      .eq(
        "id",
        manifestId
      )
      .maybeSingle();

  if (durableStateError) {
    throw new Error(
      "Unable to read vehicle location archive durable prune state: " +
        durableStateError.message
    );
  }

  const durableRow =
    durableState as
      | DurablePruneStateRow
      | null;

  if (
    durableRow &&
    durableRow.id === manifestId &&
    durableRow.pruned_at !== null
  ) {
    const result =
      await invokePruneRpc({
        supabase:
          input.supabase,

        manifestId,
      });

    return {
      executed:
        true,

      manifestId:
        result.manifestId,

      deletedRowCount:
        result.deletedRowCount,

      durableRetry:
        true,
    };
  }

  const eligibility =
    await assessVehicleLocationArchivePruningEligibility({
      supabase:
        input.supabase,

      manifestId,

      pageSize:
        input.pageSize,
    });

  if (!eligibility.eligible) {
    return {
      executed:
        false,

      manifestId:
        eligibility.manifestId,

      reason:
        eligibility.reason,
    };
  }

  const result =
    await invokePruneRpc({
      supabase:
        input.supabase,

      manifestId,
    });

  if (
    result.deletedRowCount !==
    eligibility.rowCount
  ) {
    throw new Error(
      "Vehicle location archive prune RPC deleted row count does not match independently verified archive evidence."
    );
  }

  return {
    executed:
      true,

    manifestId:
      result.manifestId,

    deletedRowCount:
      result.deletedRowCount,

    durableRetry:
      false,
  };
}