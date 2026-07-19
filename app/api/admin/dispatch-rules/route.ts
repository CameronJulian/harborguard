import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission } from "@/lib/rbac";
import { requireOrganization } from "@/lib/server-auth";

const VehicleCapabilitySchema = z.enum([
  "general",
  "security",
  "medical",
  "maintenance",
  "fire",
  "police",
]);

const DispatchRuleSchema = z.object({
  alert_type: z.string().trim().min(1, "Alert type is required."),
  preferred_capabilities: z
    .array(VehicleCapabilitySchema)
    .min(1, "At least one preferred capability is required."),
  is_active: z.boolean(),
});

function errorStatus(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  if (message === "Unauthorized") {
    return 401;
  }

  return 500;
}

export async function GET() {
  try {
    const { supabase, organizationId, role } =
      await requireOrganization();

    if (!hasPermission(role, "vehicles:manage")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("dispatch_rules")
      .select(
        "id, alert_type, preferred_capabilities, is_active, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("alert_type", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      rules: data ?? [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load dispatch rules.";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(error) },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, organizationId, role } =
      await requireOrganization();

    if (!hasPermission(role, "vehicles:manage")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = DispatchRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid dispatch rule.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const alertType = parsed.data.alert_type
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const preferredCapabilities = Array.from(
      new Set(
        parsed.data.preferred_capabilities.map((capability) =>
          capability.trim().toLowerCase(),
        ),
      ),
    );

    const { data, error } = await supabase
      .from("dispatch_rules")
      .upsert(
        {
          organization_id: organizationId,
          alert_type: alertType,
          preferred_capabilities: preferredCapabilities,
          is_active: parsed.data.is_active,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,alert_type",
        },
      )
      .select(
        "id, alert_type, preferred_capabilities, is_active, created_at, updated_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      rule: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save dispatch rule.";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(error) },
    );
  }
}