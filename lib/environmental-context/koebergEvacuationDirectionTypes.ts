export type KoebergEvacuationDirection =
  | "north"
  | "south"
  | "east";

export type KoebergEvacuationSourceLayerId =
  | 0
  | 1
  | 2;

export type KoebergEvacuationDirectionContext = {
  provider: "city_of_cape_town";

  /**
   * OBJECTID is only unique inside each source layer.
   *
   * HarborGuard therefore uses "<layerId>:<OBJECTID>" as the
   * normalized provider identity.
   */
  providerFeatureId: string;

  sourceLayerId: KoebergEvacuationSourceLayerId;

  direction: KoebergEvacuationDirection;

  /**
   * Published City NAME value when meaningful.
   */
  routeName: string | null;

  /**
   * Published City TYPE value when meaningful.
   */
  routeType: string | null;

  /**
   * True local point-to-polyline distance in metres.
   */
  distanceMeters: number;
};

export type ResolveKoebergEvacuationDirectionContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum candidate radius from the supplied coordinate.
   *
   * This is emergency-planning context only and must not be
   * interpreted as evidence of an active emergency.
   */
  searchRadiusMeters?: number;
};
