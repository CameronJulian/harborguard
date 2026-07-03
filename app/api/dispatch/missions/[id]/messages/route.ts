import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await params;

    const { data, error } = await supabase
      .from("mission_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      messages: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load mission messages." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();
    const { id } = await params;
    const body = await req.json();

    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("mission_messages")
      .insert({
        organization_id: organizationId,
        mission_id: id,
        sender_id: user?.id || null,
        sender_role: body.senderRole || "dispatcher",
        message,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send mission message." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}