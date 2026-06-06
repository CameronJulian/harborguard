import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganization } from "@/lib/server-auth";
import { hasPermission } from "@/lib/rbac";

const ToggleSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  isEnabled: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    if (!hasPermission(role, "reports:manage")) {
      return NextResponse.json(
        { error: "Permission denied." },
        { status: 403 }
      );
    }

    const { subscriptionId, isEnabled } =
      ToggleSubscriptionSchema.parse(await req.json());

    const { data, error } = await supabase
      .from("report_subscriptions")
      .update({ is_enabled: !isEnabled })
      .eq("id", subscriptionId)
      .eq("organization_id", organizationId)
      .select("id, is_enabled")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      newState: data.is_enabled,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Toggle failed.";

    const status =
      message === "Unauthorized" ? 401 : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
