import { NextResponse } from "next/server";
import {
  parseUpdateLocationInput,
  type UpdateLocationBody,
} from "@/lib/fleet/parseUpdateLocationInput";
import {
  processVehicleLocationUpdate,
} from "@/lib/fleet/processVehicleLocationUpdate";

import { requireOrganization } from "@/lib/server-auth";
import {
  authorizeRoadUserVehicle,
} from "@/lib/fleet/authorizeRoadUserVehicle";

export async function POST(req: Request) {
  try {
    const {
      supabase,
      organizationId,
      user,
      role,
    } = await requireOrganization();

    const body =
      (await req.json()) as UpdateLocationBody;

    const parsedInput =
      parseUpdateLocationInput(body);

    if (!parsedInput.ok) {
      return NextResponse.json(
        { error: parsedInput.error },
        { status: 400 }
      );
    }

    const vehicleAuthorization =
      await authorizeRoadUserVehicle({
        supabase,
        organizationId,
        userId: user.id,
        role,
        vehicleId: parsedInput.value.vehicleId,
      });

    if (!vehicleAuthorization.ok) {
      return NextResponse.json(
        { error: vehicleAuthorization.error },
        { status: vehicleAuthorization.status }
      );
    }

    const result =
      await processVehicleLocationUpdate({
        supabase,
        organizationId,
        location: parsedInput.value,
      });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        {
          status:
            result.errorType === "vehicle_not_found"
              ? 404
              : 500,
        }
      );
    }

    if (result.skipped === "jitter") {
      return NextResponse.json({
        success: true,
        skipped: "jitter",
        message:
          "Location ignored because movement was too small.",
      });
    }

    if (result.skipped === "gps_spike") {
      return NextResponse.json({
        success: true,
        skipped: "gps_spike",
        message:
          "Location ignored because it looked like a GPS spike.",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Vehicle location updated successfully.",
      vehicle: result.vehicle,
      location: result.location,
      activeTripId: result.activeTripId,
    });
  } catch (err: any) {
    console.error("UPDATE LOCATION ERROR:");
    console.error(err);

    const message =
      err.message ||
      "Failed to update vehicle location.";

    const status =
      message === "Unauthorized"
        ? 401
        : message === "Permission denied"
        ? 403
        : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
