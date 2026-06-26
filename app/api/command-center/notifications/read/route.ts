import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json().catch(() => ({}));

    const notificationId = body.notificationId as string | undefined;
    const markAll = body.markAll === true;

    if (!notificationId && !markAll) {
      return NextResponse.json(
        { error: "notificationId or markAll is required." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("command_center_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId);

    if (!markAll && notificationId) {
      query = query.eq("id", notificationId);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: markAll ? "All notifications marked as read." : "Notification marked as read.",
    });
  } catch (error: any) {
    console.error("Command center notifications read error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read." },
      { status: 500 }
    );
  }
}
