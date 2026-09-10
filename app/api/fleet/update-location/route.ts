import { after, NextResponse } from "next/server";
import {
  parseUpdateLocationInput,
  type UpdateLocationBody,
} from "@/lib/fleet/parseUpdateLocationInput";
import {
  processVehicleLocationUpdate,
} from "@/lib/fleet/processVehicleLocationUpdate";
import {
  recordCrowdLocationQualityOutcome,
} from "@/lib/fleet/recordCrowdLocationQualityOutcome";

import { requireOrganizationVerifiedClaims } from "@/lib/server-auth";

import { reportServerError } from "@/lib/server/reportServerError";
import {
  authorizeRoadUserVehicle,
} from "@/lib/fleet/authorizeRoadUserVehicle";

export async function POST(req: Request) {
  try {
    const {
      supabase,
      organizationId,
      userId,
      role,
    } = await requireOrganizationVerifiedClaims();

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
        userId,
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
      authorizedVehicle: vehicleAuthorization.vehicle,
      });

    if (!result.ok) {
      if (result.errorType === "location_persistence") {
        reportServerError(
          new Error(result.error),
          {
            domain: "fleet",
            operation: "update-location",
            boundary: "location-persistence",
          }
        );
      }

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
    after(async () => {
      try {
        await recordCrowdLocationQualityOutcome(
          result.observabilityEvent
        );
      } catch (qualityError: unknown) {
        reportServerError(
          qualityError,
          {
            domain: "fleet",
            operation: "update-location",
            boundary: "post-response-quality",
          }
        );
      }
    });


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
      err?.message ||
      "Failed to update vehicle location.";

    const status =
      message === "Unauthorized"
        ? 401
        : message === "Permission denied"
        ? 403
        : 500;

    if (status === 500) {
      reportServerError(
        err,
        {
          domain: "fleet",
          operation: "update-location",
          boundary: "outer-request",
        }
      );
    }

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}