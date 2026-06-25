import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

type AssignRouteBody = {
  vehicleId?: string;
  route?: any;
  reason?: string;
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();

    const body = (await req.json()) as AssignRouteBody;

    const vehicleId = String(body.vehicleId || "").trim();
    const route = body.route;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    if (!route) {
      return NextResponse.json(
        { error: "route is required." },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname")
      .eq("id", vehicleId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("route_assignments")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        assigned_by: user?.id ?? null,
        route_data: {
          ...route,
          reason: body.reason || "Safer route assigned from Command Center.",
          vehicleRegistration: vehicle.registration_number,
          vehicleNickname: vehicle.nickname,
        },
        status: "pending",
      })
      .select("*")
      .single();

    if (assignmentError) {
      console.error("ASSIGN ROUTE INSERT FAILED:", assignmentError);

      return NextResponse.json(
        {
          error: assignmentError.message,
          details: assignmentError,
        },
        { status: 500 }
      );
    }

    try {
      await fetch(`${new URL(req.url).origin}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body: JSON.stringify({
          title: "HarborGuard Route Update",
          body: `A safer route has been assigned for ${vehicle.registration_number}. Please review it.`,
        }),
      });
    } catch (pushError) {
      console.error("Route assignment push failed:", pushError);
    }

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to assign route." },
      { status: 500 }
    );
  }
}

