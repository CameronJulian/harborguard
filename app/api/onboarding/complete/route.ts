import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const organizationName =
    body.organizationName?.trim() || `${user.email}'s Organization`;
  const fleetSize = Number(body.fleetSize) || 0;
  const firstVehicle = body.vehicleName?.trim() || null;

  const { data: organizationId, error: onboardingError } =
    await userClient.rpc("complete_onboarding_atomic", {
      p_organization_name: organizationName,
      p_fleet_size: fleetSize,
      p_vehicle_name: firstVehicle,
    });

  if (onboardingError || typeof organizationId !== "string" || !organizationId) {
    return NextResponse.json(
      { error: "Unable to complete onboarding" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    organizationId,
  });
}
