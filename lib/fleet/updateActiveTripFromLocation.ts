export type ActiveTripFromLocation = {
  id: string;
  status: string;
};

export type UpdateActiveTripFromLocationInput = {
  supabase: any;
  organizationId: string;
  activeTrip: ActiveTripFromLocation | null;
  requestedStatus?: string;
  occurredAt: string;
};

export type UpdateActiveTripFromLocationResult = {
  updated: boolean;
  previousStatus: string | null;
  nextStatus: string | null;
};

export async function updateActiveTripFromLocation(
  input: UpdateActiveTripFromLocationInput
): Promise<UpdateActiveTripFromLocationResult> {
  const {
    supabase,
    organizationId,
    activeTrip,
    requestedStatus,
    occurredAt,
  } = input;

  if (!activeTrip) {
    return {
      updated: false,
      previousStatus: null,
      nextStatus: null,
    };
  }

  if (activeTrip.status === "scheduled") {
    const nextStatus =
      requestedStatus || "en_route_to_port";

    const { error: tripUpdateError } = await supabase
      .from("vehicle_trips")
      .update({
        status: nextStatus,
        actual_departure: occurredAt,
      })
      .eq("id", activeTrip.id)
      .eq("organization_id", organizationId);

    if (tripUpdateError) {
      throw tripUpdateError;
    }

    return {
      updated: true,
      previousStatus: activeTrip.status,
      nextStatus,
    };
  }

  if (
    requestedStatus &&
    requestedStatus !== activeTrip.status
  ) {
    const updates: Record<string, string> = {
      status: requestedStatus,
    };

    if (requestedStatus === "delivered") {
      const {
        data: completionTrip,
        error: completionTripError,
      } = await supabase
        .from("vehicle_trips")
        .select("actual_departure")
        .eq("id", activeTrip.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (completionTripError) {
        throw completionTripError;
      }

      if (!completionTrip?.actual_departure) {
        throw new Error(
          "Trip cannot be completed before actual departure is recorded."
        );
      }

      updates.actual_arrival = occurredAt;
    }

    const { error: tripUpdateError } = await supabase
      .from("vehicle_trips")
      .update(updates)
      .eq("id", activeTrip.id)
      .eq("organization_id", organizationId);

    if (tripUpdateError) {
      throw tripUpdateError;
    }

    return {
      updated: true,
      previousStatus: activeTrip.status,
      nextStatus: requestedStatus,
    };
  }

  return {
    updated: false,
    previousStatus: activeTrip.status,
    nextStatus: activeTrip.status,
  };
}
