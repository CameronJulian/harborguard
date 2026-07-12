import type {
  DashcamCamera,
  DashcamProviderResult,
} from "@/lib/dashcam/types";

import type {
  DashcamVehicle,
} from "@/lib/dashcam/providers/types";

type SamsaraVehicle = {
  id: string;
  name?: string | null;
  externalIds?: Record<string, string>;
};

type SamsaraListResponse = {
  data?: SamsaraVehicle[];
  pagination?: {
    endCursor?: string;
    hasNextPage?: boolean;
  };
};

const SAMSARA_TIMEOUT_MS = 10000;

function getSamsaraConfiguration() {
  const token =
    process.env.SAMSARA_API_TOKEN?.trim();

  const baseUrl = (
    process.env.SAMSARA_API_BASE_URL ||
    "https://api.samsara.com"
  ).replace(/\/+$/, "");

  if (!token) {
    throw new Error(
      "SAMSARA_API_TOKEN is not configured."
    );
  }

  return {
    token,
    baseUrl,
  };
}

async function samsaraFetch(
  path: string
): Promise<Response> {
  const { token, baseUrl } =
    getSamsaraConfiguration();

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    SAMSARA_TIMEOUT_MS
  );

  try {
    return await fetch(
      `${baseUrl}${path}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function matchHarborGuardVehicle(
  samsaraVehicle: SamsaraVehicle,
  vehicles: DashcamVehicle[]
) {
  const normalizedSamsaraName =
    samsaraVehicle.name?.trim().toLowerCase();

  return vehicles.find((vehicle) => {
    const registration =
      vehicle.registration_number
        ?.trim()
        .toLowerCase();

    return (
      vehicle.id === samsaraVehicle.id ||
      Boolean(
        registration &&
        normalizedSamsaraName &&
        registration === normalizedSamsaraName
      )
    );
  });
}

export async function loadSamsaraDashcams(
  vehicles: DashcamVehicle[]
): Promise<DashcamProviderResult> {
  const response = await samsaraFetch(
    "/fleet/vehicles?limit=100"
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Samsara vehicles request failed (${response.status}): ${
        body || response.statusText
      }`
    );
  }

  const result =
    (await response.json()) as SamsaraListResponse;

  const samsaraVehicles =
    Array.isArray(result.data)
      ? result.data
      : [];

  const cameras: DashcamCamera[] =
    samsaraVehicles.map(
      (samsaraVehicle) => {
        const matchedVehicle =
          matchHarborGuardVehicle(
            samsaraVehicle,
            vehicles
          );

        const vehicleId =
          matchedVehicle?.id ||
          samsaraVehicle.id;

        const vehicleName =
          matchedVehicle?.registration_number ||
          samsaraVehicle.name ||
          samsaraVehicle.id;

        return {
          id: `samsara-dashcam-${samsaraVehicle.id}`,
          vehicleId,
          vehicleName,
          nickname:
            matchedVehicle?.nickname || null,
          cameraName:
            `${vehicleName} Samsara Dashcam`,
          vendor: "samsara",
          status: "online",
          recording: true,
          storageUsedPercent: 0,
          lastHeartbeat:
            new Date().toISOString(),
          lastClipAt: null,
          latestClipLabel: null,

          // Media retrieval will be added after
          // credentials and camera-equipped test
          // vehicles have been verified.
          latestSnapshotUrl: null,
          snapshotId: null,

          aiEvents: [],
        };
      }
    );

  return {
    provider: "samsara",
    cameras,
    generatedAt: new Date().toISOString(),
  };
}
