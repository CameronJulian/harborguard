export type ResolveVehicleForProviderDeviceInput = {
  supabase: any;
  organizationId: string;
  providerDeviceId: string;
};

export type ResolvedProviderVehicle = {
  id: string;
  trackerDeviceId: string;
};

export type ResolveVehicleForProviderDeviceResult =
  | {
      ok: true;
      vehicle: ResolvedProviderVehicle;
    }
  | {
      ok: false;
      errorType: "vehicle_not_found" | "ambiguous_device";
      error: string;
    };

export async function resolveVehicleForProviderDevice({
  supabase,
  organizationId,
  providerDeviceId,
}: ResolveVehicleForProviderDeviceInput): Promise<ResolveVehicleForProviderDeviceResult> {
  const normalizedProviderDeviceId =
    providerDeviceId.trim();

  if (!normalizedProviderDeviceId) {
    return {
      ok: false,
      errorType: "vehicle_not_found",
      error: "Provider device ID is blank.",
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("vehicles")
    .select("id, tracker_device_id")
    .eq("organization_id", organizationId)
    .eq(
      "tracker_device_id",
      normalizedProviderDeviceId
    )
    .limit(2);

  if (error) {
    throw error;
  }

  const vehicles =
    Array.isArray(data) ? data : [];

  if (vehicles.length === 0) {
    return {
      ok: false,
      errorType: "vehicle_not_found",
      error:
        `No vehicle is mapped to provider device ${normalizedProviderDeviceId} in organization ${organizationId}.`,
    };
  }

  if (vehicles.length > 1) {
    return {
      ok: false,
      errorType: "ambiguous_device",
      error:
        `Multiple vehicles are mapped to provider device ${normalizedProviderDeviceId} in organization ${organizationId}.`,
    };
  }

  const vehicle =
    vehicles[0];

  return {
    ok: true,
    vehicle: {
      id: vehicle.id,
      trackerDeviceId:
        vehicle.tracker_device_id,
    },
  };
}