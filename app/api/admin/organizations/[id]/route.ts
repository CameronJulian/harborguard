import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ORGANIZATION_FIELDS = [
  "id",
  "name",
  "plan",
  "subscription_status",
  "fleet_size",
  "created_at",
  "next_billing_date",
].join(",");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    await requirePlatformAdmin();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }

  let organizationId: string;

  try {
    const params = await context.params;
    organizationId = params.id;
  } catch {
    return NextResponse.json(
      { error: "Invalid organization ID" },
      { status: 400 }
    );
  }

  if (
    typeof organizationId !== "string" ||
    !UUID_PATTERN.test(organizationId)
  ) {
    return NextResponse.json(
      { error: "Invalid organization ID" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select(ORGANIZATION_FIELDS)
      .eq("id", organizationId)
      .maybeSingle();

    if (error) {
      console.error(
        "Platform organization details failed:",
        error.code
      );

      return NextResponse.json(
        { error: "Failed to load organization" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { count: vehicleCount, error: vehicleCountError } =
      await supabaseAdmin
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);

    if (vehicleCountError || vehicleCount === null) {
      console.error(
        "Platform organization vehicle count failed:",
        vehicleCountError?.code ?? "COUNT_UNAVAILABLE"
      );

      return NextResponse.json(
        { error: "Failed to load organization vehicle count" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        organization: data,
        vehicle_count: vehicleCount,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load organization" },
      { status: 500 }
    );
  }
}