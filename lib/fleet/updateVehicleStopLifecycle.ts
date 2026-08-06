export type UpdateVehicleStopLifecycleInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  occurredAt: string;
  stopSpeedKmh: number;
  stopMinutes: number;
  minimumSlowPoints: number;
};

export type UpdateVehicleStopLifecycleResult = {
  started: boolean;
  ended: boolean;
  openStopId: string | null;
  durationSeconds: number | null;
};

export async function updateVehicleStopLifecycle(
  input: UpdateVehicleStopLifecycleInput
): Promise<UpdateVehicleStopLifecycleResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    speedKmh,
    occurredAt,
    stopSpeedKmh,
    stopMinutes,
    minimumSlowPoints,
  } = input;

  if (speedKmh <= stopSpeedKmh) {
    const since = new Date(
      Date.now() - stopMinutes * 60 * 1000
    ).toISOString();

    const { data: recentSlowPoints } =
      await supabase
        .from("vehicle_locations")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId)
        .gte("recorded_at", since)
        .lte("speed_kmh", stopSpeedKmh);

    if (
      (recentSlowPoints || []).length <
      minimumSlowPoints
    ) {
      return {
        started: false,
        ended: false,
        openStopId: null,
        durationSeconds: null,
      };
    }

    const { data: openStop } =
      await supabase
        .from("vehicle_stops")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId)
        .is("ended_at", null)
        .maybeSingle();

    if (openStop) {
      return {
        started: false,
        ended: false,
        openStopId: openStop.id,
        durationSeconds: null,
      };
    }

    const { data: createdStop } =
      await supabase
        .from("vehicle_stops")
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          trip_id: tripId,
          latitude,
          longitude,
          started_at: since,
        })
        .select("id")
        .maybeSingle();

    return {
      started: true,
      ended: false,
      openStopId: createdStop?.id || null,
      durationSeconds: null,
    };
  }

  const { data: openStop } =
    await supabase
      .from("vehicle_stops")
      .select("id, started_at")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .is("ended_at", null)
      .maybeSingle();

  if (!openStop) {
    return {
      started: false,
      ended: false,
      openStopId: null,
      durationSeconds: null,
    };
  }

  const durationSeconds = Math.floor(
    (
      new Date(occurredAt).getTime() -
      new Date(openStop.started_at).getTime()
    ) / 1000
  );

  await supabase
    .from("vehicle_stops")
    .update({
      ended_at: occurredAt,
      duration_seconds: durationSeconds,
    })
    .eq("id", openStop.id)
    .eq("organization_id", organizationId);

  return {
    started: false,
    ended: true,
    openStopId: openStop.id,
    durationSeconds,
  };
}
