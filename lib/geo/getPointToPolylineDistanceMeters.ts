
export type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

type XYCoordinate = [number, number];

const EARTH_RADIUS_METERS = 6_371_000;

function isFiniteCoordinate(
  coordinate: XYCoordinate
) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(Number(coordinate[0])) &&
    Number.isFinite(Number(coordinate[1]))
  );
}

/**
 * Converts longitude/latitude degrees into a local metre-based
 * coordinate system centred around the supplied latitude.
 *
 * This local equirectangular approximation is appropriate for the
 * short distances used by road matching around Cape Town.
 */
function toLocalMeters(
  longitude: number,
  latitude: number,
  referenceLatitude: number
) {
  const latitudeRadians =
    (referenceLatitude * Math.PI) / 180;

  return {
    x:
      (longitude * Math.PI / 180) *
      EARTH_RADIUS_METERS *
      Math.cos(latitudeRadians),

    y:
      (latitude * Math.PI / 180) *
      EARTH_RADIUS_METERS,
  };
}

function getPointToSegmentDistanceMeters(
  point: GeoCoordinate,
  start: XYCoordinate,
  end: XYCoordinate
): number | null {
  if (
    !isFiniteCoordinate(start) ||
    !isFiniteCoordinate(end)
  ) {
    return null;
  }

  const startLongitude = Number(start[0]);
  const startLatitude = Number(start[1]);

  const endLongitude = Number(end[0]);
  const endLatitude = Number(end[1]);

  const referenceLatitude = point.latitude;

  const pointLocal = toLocalMeters(
    point.longitude,
    point.latitude,
    referenceLatitude
  );

  const startLocal = toLocalMeters(
    startLongitude,
    startLatitude,
    referenceLatitude
  );

  const endLocal = toLocalMeters(
    endLongitude,
    endLatitude,
    referenceLatitude
  );

  const dx = endLocal.x - startLocal.x;
  const dy = endLocal.y - startLocal.y;

  const segmentLengthSquared =
    dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    const distanceX =
      pointLocal.x - startLocal.x;

    const distanceY =
      pointLocal.y - startLocal.y;

    return Math.sqrt(
      distanceX * distanceX +
      distanceY * distanceY
    );
  }

  const projection =
    (
      (pointLocal.x - startLocal.x) * dx +
      (pointLocal.y - startLocal.y) * dy
    ) /
    segmentLengthSquared;

  const clampedProjection = Math.max(
    0,
    Math.min(1, projection)
  );

  const nearestX =
    startLocal.x + clampedProjection * dx;

  const nearestY =
    startLocal.y + clampedProjection * dy;

  const distanceX =
    pointLocal.x - nearestX;

  const distanceY =
    pointLocal.y - nearestY;

  return Math.sqrt(
    distanceX * distanceX +
    distanceY * distanceY
  );
}

export function getPointToPolylineDistanceMeters(
  point: GeoCoordinate,
  paths: unknown
): number | null {
  if (
    !Number.isFinite(point?.latitude) ||
    !Number.isFinite(point?.longitude)
  ) {
    return null;
  }

  if (!Array.isArray(paths)) {
    return null;
  }

  let minimumDistance: number | null = null;

  for (const path of paths) {
    if (!Array.isArray(path)) {
      continue;
    }

    const coordinates = path.filter(
      (coordinate): coordinate is XYCoordinate =>
        isFiniteCoordinate(coordinate)
    );

    if (coordinates.length === 1) {
      const longitude = Number(coordinates[0][0]);
      const latitude = Number(coordinates[0][1]);

      const pointLocal = toLocalMeters(
        point.longitude,
        point.latitude,
        point.latitude
      );

      const coordinateLocal = toLocalMeters(
        longitude,
        latitude,
        point.latitude
      );

      const distanceX =
        pointLocal.x - coordinateLocal.x;

      const distanceY =
        pointLocal.y - coordinateLocal.y;

      const distance = Math.sqrt(
        distanceX * distanceX +
        distanceY * distanceY
      );

      if (
        Number.isFinite(distance) &&
        (
          minimumDistance === null ||
          distance < minimumDistance
        )
      ) {
        minimumDistance = distance;
      }

      continue;
    }

    for (
      let index = 0;
      index < coordinates.length - 1;
      index += 1
    ) {
      const distance =
        getPointToSegmentDistanceMeters(
          point,
          coordinates[index],
          coordinates[index + 1]
        );

      if (
        distance !== null &&
        Number.isFinite(distance) &&
        (
          minimumDistance === null ||
          distance < minimumDistance
        )
      ) {
        minimumDistance = distance;
      }
    }
  }

  return minimumDistance;
}