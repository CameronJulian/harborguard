export type KoebergProtectiveActionZoneContext = {
  provider: "city_of_cape_town";

  /**
   * City Layer 3 does not expose a GlobalID in the audited
   * schema, so OBJECTID is retained as provider identity.
   */
  providerFeatureId: string;

  /**
   * Published Protective Action Zone number from ZONE_NMBR.
   */
  zoneNumber: string | null;
};

export type ResolveKoebergProtectiveActionZoneContextParams = {
  latitude: number;
  longitude: number;
};
