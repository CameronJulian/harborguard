export type PoliceStationContext = {
  provider: "city_of_cape_town";

  /**
   * City Police Stations Layer 7 does not expose a station
   * code or GlobalID, so OBJECTID is retained as the provider
   * feature identity.
   */
  providerFeatureId: string;

  /**
   * Published police-station name from STN.
   */
  stationName: string | null;

  /**
   * Published City police cluster from CLST.
   */
  cluster: string | null;

  /**
   * Straight-line distance from the requested location to
   * the selected City police-station point.
   */
  distanceMeters: number;
};

export type ResolvePoliceStationContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Candidate lookup radius.
   *
   * Provider defaults and safety limits are applied by the
   * City implementation.
   */
  searchRadiusMeters?: number;
};
