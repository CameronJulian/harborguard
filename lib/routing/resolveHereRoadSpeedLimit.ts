const EARTH_RADIUS_METERS = 6371e3;
const LOOKAHEAD_DISTANCE_METERS = 100;

type ResolveHereRoadSpeedLimitParams = {
  latitude: number;
  longitude: number;
  heading: number;
};

type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

function destinationPoint(
  latitude: number,
  longitude: number,
  heading: number,
  distanceMeters: number
): GeographicCoordinate {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const headingRadians = (heading * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const destinationLatitudeRadians = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) *
        Math.sin(angularDistance) *
        Math.cos(headingRadians)
  );

  const destinationLongitudeRadians =
    longitudeRadians +
    Math.atan2(
      Math.sin(headingRadians) *
        Math.sin(angularDistance) *
        Math.cos(latitudeRadians),
      Math.cos(angularDistance) -
        Math.sin(latitudeRadians) *
          Math.sin(destinationLatitudeRadians)
    );

  return {
    latitude: (destinationLatitudeRadians * 180) / Math.PI,
    longitude: (destinationLongitudeRadians * 180) / Math.PI,
  };
}

export async function resolveHereRoadSpeedLimit({
  latitude,
  longitude,
  heading,
}: ResolveHereRoadSpeedLimitParams): Promise<number | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(heading) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const apiKey = process.env.HERE_API_KEY;

  if (!apiKey) {
    return null;
  }

  const normalizedHeading = ((heading % 360) + 360) % 360;

  const destination = destinationPoint(
    latitude,
    longitude,
    normalizedHeading,
    LOOKAHEAD_DISTANCE_METERS
  );

  const url =
    "https://router.hereapi.com/v8/routes" +
    "?transportMode=car" +
    `&origin=${latitude},${longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    "&return=summary,polyline" +
    "&spans=length,maxSpeed" +
    `&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const spans = data?.routes?.[0]?.sections?.[0]?.spans;

    if (!Array.isArray(spans)) {
      return null;
    }

    const firstSpeedSpan = spans.find((span: unknown) => {
      if (
        typeof span !== "object" ||
        span === null ||
        !("maxSpeed" in span)
      ) {
        return false;
      }

      const maxSpeed = Number(
        (span as { maxSpeed?: unknown }).maxSpeed
      );

      return Number.isFinite(maxSpeed) && maxSpeed > 0;
    });

    if (!firstSpeedSpan) {
      return null;
    }

    const maxSpeedMetersPerSecond = Number(
      (firstSpeedSpan as { maxSpeed: unknown }).maxSpeed
    );

    return maxSpeedMetersPerSecond * 3.6;
  } catch {
    return null;
  }
}
