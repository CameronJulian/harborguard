export type RoadContext = {
  provider: string;

  providerSegmentId: string | null;

  roadName: string | null;

  roadClassification: string | null;

  speedLimitKph: number | null;

  speedLimitSource: string | null;

  direction: string | null;

  surfaceType: string | null;

  maintenanceAuthority: string | null;

  ownership: string | null;

  distanceMeters: number | null;
};

export type ResolveRoadContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum search distance from the supplied coordinate.
   *
   * The provider may return null when no trustworthy road segment
   * exists inside this radius.
   */
  searchRadiusMeters?: number;
};