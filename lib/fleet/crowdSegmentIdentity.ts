export const CROWD_SEGMENT_KEY_DECIMAL_PLACES =
  3 as const;

export const CROWD_SEGMENT_KEY_VERSION =
  "harborguard-crowd-segment-key-v1" as const;

export const CROWD_DIRECTION_BUCKET_VERSION =
  "harborguard-crowd-direction-bucket-v1" as const;

export const CROWD_DIRECTION_BUCKET_LABELS = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;

export type CrowdDirectionBucket =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

export function buildCrowdSegmentKey(
  latitude: number,
  longitude: number
): string {
  return `${latitude.toFixed(
    CROWD_SEGMENT_KEY_DECIMAL_PLACES
  )}:${longitude.toFixed(
    CROWD_SEGMENT_KEY_DECIMAL_PLACES
  )}`;
}

function movementBearingDegrees(
  previousLatitude: number,
  previousLongitude: number,
  latitude: number,
  longitude: number
): number {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const toDegrees = (radians: number) =>
    (radians * 180) / Math.PI;

  const previousLatRadians =
    toRadians(previousLatitude);

  const latitudeRadians =
    toRadians(latitude);

  const deltaLongitude =
    toRadians(
      longitude - previousLongitude
    );

  const y =
    Math.sin(deltaLongitude) *
    Math.cos(latitudeRadians);

  const x =
    Math.cos(previousLatRadians) *
      Math.sin(latitudeRadians) -
    Math.sin(previousLatRadians) *
      Math.cos(latitudeRadians) *
      Math.cos(deltaLongitude);

  const bearing =
    toDegrees(
      Math.atan2(y, x)
    );

  return (bearing + 360) % 360;
}

export function resolveCrowdDirectionBucket(
  previousLatitude: number,
  previousLongitude: number,
  latitude: number,
  longitude: number
): CrowdDirectionBucket | null {
  if (
    previousLatitude === latitude &&
    previousLongitude === longitude
  ) {
    return null;
  }

  const bearing =
    movementBearingDegrees(
      previousLatitude,
      previousLongitude,
      latitude,
      longitude
    );

  return (
    Math.floor(
      ((bearing + 22.5) % 360) / 45
    ) % 8
  ) as CrowdDirectionBucket;
}
