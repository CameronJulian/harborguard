import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await context.params;
    const body = await req.json();

    const { data, error } = await supabase
      .from("vehicles")
      .update({
        nickname: body.nickname,
        registration_number: body.registration_number,
        make: body.make,
        model: body.model,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ vehicle: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update vehicle." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await context.params;

    const { error } = await supabase
      .from("vehicles")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete vehicle." }, { status: 500 });
  }
}
