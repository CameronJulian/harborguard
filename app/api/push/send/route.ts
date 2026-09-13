import { NextResponse } from "next/server";
import { sendWebPushNotification } from "@/lib/web-push";
import { requireOrganization } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json().catch(() => ({}));

    const title = body.title || "HarborGuard Alert";
    const message =
      body.body || body.message || "High-risk incident detected on route.";

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No active push subscriptions found.",
      });
    }

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await sendWebPushNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key,
              },
            },
            JSON.stringify({
              title,
              body: message,
              icon: "/icon.png",
              url: "/command-center",
            })
          );

          sent++;
        } catch (err: any) {
          failed++;

          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          }

          console.error("Push send failed:", err);
        }
      })
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send push notification." },
      { status: 500 }
    );
  }
}
