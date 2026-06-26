import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { searchParams } = new URL(req.url);
    const includeResolved = searchParams.get("includeResolved") === "true";

    let query = supabase
      .from("command_center_notifications")
      .select(`
        id,
        organization_id,
        vehicle_id,
        title,
        message,
        severity,
        type,
        source,
        is_read,
        is_resolved,
        metadata,
        created_at,
        read_at,
        resolved_at,
        vehicles (
          id,
          registration_number,
          nickname
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!includeResolved) {
      query = query.eq("is_resolved", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    const unreadCount = (data || []).filter((item: any) => !item.is_read).length;
    const criticalCount = (data || []).filter(
      (item: any) => item.severity === "critical" && !item.is_resolved
    ).length;

    return NextResponse.json({
      success: true,
      notifications: data || [],
      stats: {
        unreadCount,
        criticalCount,
        total: data?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Command center notifications GET error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to load notifications." },
      { status: 500 }
    );
  }
}
