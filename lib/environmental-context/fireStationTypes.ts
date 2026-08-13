export type FireStationContext = {
  provider: "city_of_cape_town";

  /**
   * Stable City identity.
   *
   * FIRE_STN_CODE is preferred when available.
   * OBJECTID is used only as fallback.
   */
  providerFeatureId: string;

  /**
   * Published City fire-station name.
   */
  stationName: string | null;

  /**
   * Published City station code.
   */
  stationCode: string | null;

  /**
   * Published City station classification.
   *
   * Preserved verbatim so HarborGuard does not reinterpret
   * operational classifications such as COMMUNITY STATION,
   * DIVISIONAL HQ or FIRE SERVICE HEAD OFFICE.
   */
  stationClass: string | null;

  /**
   * Straight-line distance from the requested location to
   * the selected City fire-station point.
   */
  distanceMeters: number;
};

export type ResolveFireStationContextParams = {
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
