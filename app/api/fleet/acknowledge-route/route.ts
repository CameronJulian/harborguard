import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const assignmentId = String(body.assignmentId || "").trim();

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("route_assignments")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge route." },
      { status: 500 }
    );
  }
}
