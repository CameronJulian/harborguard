export type LatestVehicleLocation = {
  latitude: number | string | null;
  longitude: number | string | null;
  speed_kmh: number | string | null;
  heading: number | string | null;
  recorded_at: string;
};

export type GetLatestVehicleLocationInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
};

export async function getLatestVehicleLocation(
  input: GetLatestVehicleLocationInput
): Promise<LatestVehicleLocation | null> {
  const {
    supabase,
    organizationId,
    vehicleId,
  } = input;

  const { data: lastPoint } =
    await supabase
      .from("vehicle_locations")
      .select(
        "latitude, longitude, speed_kmh, heading, recorded_at"
      )
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  return lastPoint;
}
