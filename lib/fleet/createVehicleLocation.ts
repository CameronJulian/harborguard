export type CreateVehicleLocationInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  recordedAt: string;
  source: "mobile" | "hardware" | "manual";
  roadSpeedLimitKmh: number | null;
};

export type CreateVehicleLocationResult = {
  error: any;
};

export async function createVehicleLocation(
  input: CreateVehicleLocationInput
): Promise<CreateVehicleLocationResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    speedKmh,
    heading,
    recordedAt,
    source,
    roadSpeedLimitKmh,
  } = input;

  const { error } = await supabase
    .from("vehicle_locations")
    .insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      trip_id: tripId,
      latitude,
      longitude,
      speed_kmh: speedKmh,
      heading,
      recorded_at: recordedAt,
      source,
      road_speed_limit_kmh: roadSpeedLimitKmh,
    });

  return {
    error,
  };
}
