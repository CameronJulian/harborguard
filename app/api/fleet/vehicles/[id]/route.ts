import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganization } from "@/lib/server-auth";
import { hasPermission } from "@/lib/rbac";

const VehicleUpdateSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  registration_number: z.string().min(1).max(50).optional(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  vehicle_type: z
    .enum(["general", "security", "medical", "maintenance", "fire", "police"])
    .optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    if (!hasPermission(role, "vehicles:manage")) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = VehicleUpdateSchema.parse(await req.json());

    const { data, error } = await supabase
      .from("vehicles")
      .update(body)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, vehicle: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update vehicle.";
    const status = message === "Unauthorized" ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    if (!hasPermission(role, "vehicles:manage")) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    const { id } = await context.params;

    const { data, error } = await supabase
      .from("vehicles")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete vehicle.";
    const status = message === "Unauthorized" ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
