export type KoebergRadiiPlanningContext = {
  provider: "city_of_cape_town";

  /**
   * City Layer 4 does not expose a GlobalID in the audited
   * schema, so OBJECTID is retained as provider identity.
   */
  providerFeatureId: string;

  /**
   * Published Koeberg planning-distance band from DSTN,
   * normalized to kilometres.
   */
  planningDistanceKm: number;
};

export type ResolveKoebergRadiiPlanningContextParams = {
  latitude: number;
  longitude: number;
};
