import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildVehicleLocationArchiveObject,
  type VehicleLocationArchiveObject,
} from "@/lib/fleet/buildVehicleLocationArchiveObject";

import {
  readVehicleLocationArchiveRows,
} from "@/lib/fleet/readVehicleLocationArchiveRows";

export type PrepareVehicleLocationArchiveInput = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  vehicleId:
    string;

  tripId:
    string | null;

  firstRecordedAt:
    string;

  lastRecordedAt:
    string;

  pageSize?:
    number;
};

export type PreparedVehicleLocationArchive = {
  archive:
    VehicleLocationArchiveObject;

  source: {
    organizationId:
      string;

    vehicleId:
      string;

    tripId:
      string | null;

    requestedFirstRecordedAt:
      string;

    requestedLastRecordedAt:
      string;

    sourceRowCount:
      number;
  };
};

export async function prepareVehicleLocationArchive(
  input:
    PrepareVehicleLocationArchiveInput
): Promise<
  PreparedVehicleLocationArchive
> {
  const rows =
    await readVehicleLocationArchiveRows({
      supabase:
        input.supabase,

      organizationId:
        input.organizationId,

      vehicleId:
        input.vehicleId,

      tripId:
        input.tripId,

      firstRecordedAt:
        input.firstRecordedAt,

      lastRecordedAt:
        input.lastRecordedAt,

      pageSize:
        input.pageSize,
    });

  if (rows.length === 0) {
    throw new Error(
      "Unable to prepare vehicle location archive: bounded source returned no rows."
    );
  }

  const archive =
    buildVehicleLocationArchiveObject(
      rows
    );

  return {
    archive,

    source: {
      organizationId:
        archive.organizationId,

      vehicleId:
        archive.vehicleId,

      tripId:
        archive.tripId,

      requestedFirstRecordedAt:
        input.firstRecordedAt,

      requestedLastRecordedAt:
        input.lastRecordedAt,

      sourceRowCount:
        rows.length,
    },
  };
}
