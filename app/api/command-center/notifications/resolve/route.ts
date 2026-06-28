import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json().catch(() => ({}));

    const notificationId = body.notificationId as string | undefined;

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("command_center_notifications")
      .update({
        is_resolved: true,
        is_read: true,
        read_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", notificationId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Notification resolved.",
    });
  } catch (error: any) {
    console.error("Command center notifications resolve error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to resolve notification." },
      { status: 500 }
    );
  }
}


