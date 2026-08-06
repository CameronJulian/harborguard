export type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6371e3;

export function getDistanceMeters(
  first: GeographicCoordinate,
  second: GeographicCoordinate
): number {
  const firstLatitudeRadians =
    (first.latitude * Math.PI) / 180;

  const secondLatitudeRadians =
    (second.latitude * Math.PI) / 180;

  const latitudeDifferenceRadians =
    ((second.latitude - first.latitude) *
      Math.PI) /
    180;

  const longitudeDifferenceRadians =
    ((second.longitude - first.longitude) *
      Math.PI) /
    180;

  const haversineValue =
    Math.sin(
      latitudeDifferenceRadians / 2
    ) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(
        longitudeDifferenceRadians / 2
      ) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    )
  );
}
