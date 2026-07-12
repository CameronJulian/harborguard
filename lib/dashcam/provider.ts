import type {
  DashcamProviderResult,
} from "@/lib/dashcam/types";

import type {
  DashcamVehicle,
} from "@/lib/dashcam/providers/types";

import {
  loadMockDashcams,
} from "@/lib/dashcam/providers/mock";

import {
  loadLocalDashcams,
} from "@/lib/dashcam/providers/local";

export async function loadDashcams(
  vehicles: DashcamVehicle[]
): Promise<DashcamProviderResult> {
  const provider = String(
    process.env.DASHCAM_PROVIDER || "mock"
  )
    .trim()
    .toLowerCase();

  switch (provider) {
    case "mock":
      return loadMockDashcams(vehicles);

    case "local":
      return loadLocalDashcams(vehicles);

    default:
      throw new Error(
        `Dashcam provider ${provider} is not configured yet.`
      );
  }
}
