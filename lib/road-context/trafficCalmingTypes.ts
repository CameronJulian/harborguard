export type TrafficCalmingFeatureType =
  | "speed_bump"
  | "raised_intersection";

export type TrafficCalmingContext = {
  provider: "city_of_cape_town";

  featureType: TrafficCalmingFeatureType;

  providerFeatureId: string;

  ownership: string | null;

  statusCode: number | null;

  latitude: number;

  longitude: number;

  distanceMeters: number;
};

export type ResolveTrafficCalmingContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum search distance from the supplied coordinate.
   *
   * The provider may return null when no trustworthy
   * traffic-calming feature exists inside this radius.
   */
  searchRadiusMeters?: number;
};
