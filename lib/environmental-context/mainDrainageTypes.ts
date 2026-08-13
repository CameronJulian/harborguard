export type MainDrainageContext = {
  provider: "city_of_cape_town";

  providerFeatureId: string | null;

  assetType: string | null;

  crossSection: string | null;

  material: string | null;

  nominalDiameterMm: number | null;

  internalDiameterMm: number | null;

  widthMm: number | null;

  heightMm: number | null;

  upstreamInvertLevel: number | null;

  downstreamInvertLevel: number | null;

  gradient: number | null;

  crossing: string | null;

  linkFunction: string | null;

  integratedUrbanDrainage: string | null;

  dateConstructed: number | null;

  locationDescription: string | null;

  catchment: string | null;

  district: number | null;

  planningRegion: string | null;

  comment: string | null;

  sapObjectType: string | null;

  sapDescription: string | null;

  sapUserStatus: number | null;

  financialAssetKey: string | null;

  syncDate: number | null;

  ownership: string | null;

  maintenanceAuthority: string | null;

  distanceMeters: number;
};

export type ResolveMainDrainageContextParams = {
  latitude: number;
  longitude: number;

  /**
   * Maximum lookup radius from the supplied coordinate.
   *
   * Main-drainage proximity is infrastructure context only.
   * It must not be treated as evidence of active flooding.
   */
  searchRadiusMeters?: number;
};
