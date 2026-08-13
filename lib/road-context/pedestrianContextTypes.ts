export type PedestrianContext = {
  provider: "city_of_cape_town";

  featureType: "pedestrian_crossing";

  providerFeatureId: string;

  ownership: string | null;

  statusCode: number | null;

  raised: boolean | null;

  latitude: number;

  longitude: number;

  distanceMeters: number;
};

export type ResolvePedestrianContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum search distance from the supplied coordinate.
   *
   * The provider may return null when no trustworthy
   * pedestrian crossing exists inside this radius.
   */
  searchRadiusMeters?: number;
};
