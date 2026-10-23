export type ProviderGeometryCoordinate =
  [number, number];

type ProviderGeometryPoint = {
  lat?: unknown;
  lng?: unknown;
};

type ProviderGeometryLink = {
  points?: unknown;
};

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadius = 6371000;

  const toRad =
    (value: number) =>
      (value * Math.PI) / 180;

  const dLat =
    toRad(lat2 - lat1);

  const dLng =
    toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return (
    earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )
  );
}

export function extractProviderGeometryCoordinates(
  geometry: unknown,
): ProviderGeometryCoordinate[] {
  if (
    !geometry ||
    typeof geometry !== "object"
  ) {
    return [];
  }

  const value =
    geometry as {
      type?: unknown;
      coordinates?: unknown;
      links?: unknown;
      shape?: { links?: unknown } | null;
    };

  // TomTom GeoJSON LineString:
  // [longitude, latitude].
  if (
    value.type === "LineString" &&
    Array.isArray(value.coordinates)
  ) {
    return value.coordinates
      .filter(
        (coordinate: unknown): coordinate is unknown[] =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(
            Number(coordinate[0]),
          ) &&
          Number.isFinite(
            Number(coordinate[1]),
          ),
      )
      .map(
        (
          coordinate: unknown[],
        ): ProviderGeometryCoordinate => [
          Number(coordinate[1]),
          Number(coordinate[0]),
        ],
      );
  }

  // HERE geometry may be:
  // { links: [...] }
  // or
  // { shape: { links: [...] } }.
  const hereLinks =
    Array.isArray(value.links)
      ? value.links
      : Array.isArray(
            value.shape?.links,
          )
        ? value.shape.links
        : null;

  if (!hereLinks) {
    return [];
  }

  return hereLinks.flatMap(
    (link: ProviderGeometryLink | null | undefined) =>
      Array.isArray(link?.points)
        ? link.points
            .filter(
              (point: ProviderGeometryPoint | null | undefined): point is ProviderGeometryPoint =>
                Number.isFinite(
                  Number(point?.lat),
                ) &&
                Number.isFinite(
                  Number(point?.lng),
                ),
            )
            .map(
              (
                point: ProviderGeometryPoint,
              ): ProviderGeometryCoordinate => [
                Number(point.lat),
                Number(point.lng),
              ],
            )
        : [],
  );
}

export function getMinimumProviderGeometryDistanceMeters(
  routePoints: ProviderGeometryCoordinate[],
  geometry: unknown,
): number | null {
  const geometryPoints =
    extractProviderGeometryCoordinates(
      geometry,
    );

  if (
    routePoints.length === 0 ||
    geometryPoints.length === 0
  ) {
    return null;
  }

  let minimumDistance =
    Number.POSITIVE_INFINITY;

  for (
    const [
      routeLatitude,
      routeLongitude,
    ] of routePoints
  ) {
    for (
      const [
        geometryLatitude,
        geometryLongitude,
      ] of geometryPoints
    ) {
      const distance =
        distanceMeters(
          routeLatitude,
          routeLongitude,
          geometryLatitude,
          geometryLongitude,
        );

      if (
        distance <
        minimumDistance
      ) {
        minimumDistance =
          distance;
      }
    }
  }

  return Number.isFinite(
    minimumDistance,
  )
    ? minimumDistance
    : null;
}

export function providerGeometryScoreMultiplier(
  distanceMetersValue:
    number | null,
): number {
  if (
    distanceMetersValue === null
  ) {
    return 1;
  }

  if (distanceMetersValue <= 50) {
    return 1;
  }

  if (distanceMetersValue <= 150) {
    return 0.9;
  }

  if (distanceMetersValue <= 300) {
    return 0.75;
  }

  if (distanceMetersValue <= 500) {
    return 0.6;
  }

  if (distanceMetersValue <= 1000) {
    return 0.4;
  }

  return 0.25;
}
