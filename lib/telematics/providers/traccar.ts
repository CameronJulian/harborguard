export type TraccarDevice = {
  id: number;
  name?: string | null;
  uniqueId?: string | null;
  status?: string | null;
  positionId?: number | null;
};

export type TraccarPosition = {
  id: number;
  deviceId: number;
  protocol?: string | null;
  deviceTime?: string | null;
  fixTime?: string | null;
  serverTime?: string | null;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  course?: number | null;
  accuracy?: number | null;
  valid?: boolean;
  attributes?: Record<string, unknown>;
};

export type NormalizedTraccarPosition = {
  providerMessageId: string;
  providerDeviceId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  recordedAt: string;
};

const TRACCAR_TIMEOUT_MS = 10000;
const KNOTS_TO_KMH = 1.852;

export type TraccarConfiguration = {
  token: string;
  baseUrl: string;
};

export function getEnvironmentTraccarConfiguration(): TraccarConfiguration {
  const token =
    process.env.TRACCAR_API_TOKEN?.trim();

  const baseUrl = (
    process.env.TRACCAR_API_BASE_URL ||
    "https://demo3.traccar.org"
  ).replace(/\/+$/, "");

  if (!token) {
    throw new Error(
      "TRACCAR_API_TOKEN is not configured."
    );
  }

  return {
    token,
    baseUrl,
  };
}

async function traccarFetch(
  path: string,
  configuration: TraccarConfiguration
): Promise<Response> {
  const {
    token,
    baseUrl,
  } = configuration;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TRACCAR_TIMEOUT_MS
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

export async function loadTraccarDevices(
  configuration: TraccarConfiguration =
    getEnvironmentTraccarConfiguration()
): Promise<
  TraccarDevice[]
> {
  const response =
    await traccarFetch(
      "/api/devices",
      configuration
    );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Traccar devices request failed (${response.status}): ${
        body || response.statusText
      }`
    );
  }

  const result =
    (await response.json()) as unknown;

  return Array.isArray(result)
    ? (result as TraccarDevice[])
    : [];
}

export async function loadTraccarLatestPositions(
  configuration: TraccarConfiguration =
    getEnvironmentTraccarConfiguration()
): Promise<
  TraccarPosition[]
> {
  const response =
    await traccarFetch(
      "/api/positions",
      configuration
    );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Traccar positions request failed (${response.status}): ${
        body || response.statusText
      }`
    );
  }

  const result =
    (await response.json()) as unknown;

  return Array.isArray(result)
    ? (result as TraccarPosition[])
    : [];
}

function parseTraccarTimestamp(
  position: TraccarPosition
): string {
  const candidate =
    position.fixTime ||
    position.deviceTime ||
    position.serverTime;

  if (!candidate) {
    throw new Error(
      `Traccar position ${position.id} has no usable event timestamp.`
    );
  }

  const parsed =
    new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Traccar position ${position.id} has an invalid event timestamp.`
    );
  }

  return parsed.toISOString();
}

export function normalizeTraccarPosition(
  position: TraccarPosition
): NormalizedTraccarPosition {
  if (!Number.isFinite(position.latitude)) {
    throw new Error(
      `Traccar position ${position.id} has invalid latitude.`
    );
  }

  if (!Number.isFinite(position.longitude)) {
    throw new Error(
      `Traccar position ${position.id} has invalid longitude.`
    );
  }

  if (
    position.latitude < -90 ||
    position.latitude > 90
  ) {
    throw new Error(
      `Traccar position ${position.id} latitude is out of range.`
    );
  }

  if (
    position.longitude < -180 ||
    position.longitude > 180
  ) {
    throw new Error(
      `Traccar position ${position.id} longitude is out of range.`
    );
  }

  const speedKnots =
    Number.isFinite(position.speed)
      ? Number(position.speed)
      : 0;

  const heading =
    Number.isFinite(position.course)
      ? Number(position.course)
      : 0;

  return {
    providerMessageId:
      String(position.id),
    providerDeviceId:
      String(position.deviceId),
    latitude:
      position.latitude,
    longitude:
      position.longitude,
    speedKmh:
      speedKnots * KNOTS_TO_KMH,
    heading,
    recordedAt:
      parseTraccarTimestamp(position),
  };
}
