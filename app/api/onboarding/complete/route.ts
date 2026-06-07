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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const organizationName =
    body.organizationName?.trim() || `${user.email}'s Organization`;

  const fleetSize = Number(body.fleetSize) || 0;
  const firstVehicle = body.vehicleName?.trim() || null;

  const trialEndsAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.organization_id) {
    return NextResponse.json({
      success: true,
      organizationId: existingProfile.organization_id,
    });
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: organizationName,
      fleet_size: fleetSize,
      first_vehicle: firstVehicle,
      subscription_status: "trialing",
      subscription_plan: "starter",
      plan: "trial",
      trial_ends_at: trialEndsAt,
      seats: 1,
      billing_email: user.email,
    })
    .select("id")
    .single();

  if (orgError || !organization) {
    return NextResponse.json(
      { error: orgError?.message || "Organization creation failed" },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.email?.split("@")[0] || "HarborGuard User",
    role: "manager",
    organization_id: organization.id,
  });

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    organizationId: organization.id,
  });
}
