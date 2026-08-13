export type DrainageCatchmentContext = {
  provider: "city_of_cape_town";

  /**
   * Stable City catchment-region identity, normally RGN_ID.
   */
  providerFeatureId: string;

  /**
   * City's catchment-region label, for example:
   * City, Salt, HBay.
   */
  catchmentRegion: string | null;

  /**
   * Published City polygon area.
   */
  areaKm2: number | null;
};

export type ResolveDrainageCatchmentContextParams = {
  latitude: number;
  longitude: number;
};
