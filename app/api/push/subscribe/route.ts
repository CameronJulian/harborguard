import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

type PushSubscribeBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();

    const body = (await req.json()) as PushSubscribeBody;

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          organization_id: organizationId,
          user_id: user.id,
          endpoint: body.endpoint,
          p256dh_key: body.keys.p256dh,
          auth_key: body.keys.auth,
          user_agent: req.headers.get("user-agent"),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription saved.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save push subscription." },
      { status: 500 }
    );
  }
}
