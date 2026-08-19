import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const BROAD_VEHICLE_ROLES = new Set([
  "owner",
  "admin",
  "super_admin",
  "platform_admin",
  "manager",
]);

export async function GET() {
  try {
    const {
      supabase,
      organizationId,
      user,
      role,
    } = await requireOrganization();

    let query = supabase
      .from("vehicles")
      .select(`
        id,
        nickname,
        registration_number,
        make,
        model,
        is_active,
        assigned_user_id
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!BROAD_VEHICLE_ROLES.has(String(role || ""))) {
      if (role !== "operator") {
        return NextResponse.json(
          { error: "Permission denied." },
          { status: 403 }
        );
      }

      query = query.eq("assigned_user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicles: data || [],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load road-user vehicles.";

    const status =
      message === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
