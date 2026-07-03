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
      .from("mission_notes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notes: data || []
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load mission notes." },
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

    const { data, error } = await supabase
      .from("mission_notes")
      .insert({
        organization_id: organizationId,
        mission_id: id,
        author_id: user?.id ?? null,
        notes: body.notes,
        metadata: body.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      note: data
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save mission note." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}