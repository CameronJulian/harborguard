import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getDateRange(period: "daily" | "weekly") {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);

  const start = new Date(now);
  if (period === "daily") {
    start.setDate(start.getDate() - 1);
  } else {
    start.setDate(start.getDate() - 7);
  }

  const startDate = start.toISOString().slice(0, 10);
  return { startDate, endDate };
}

type SubscriptionRow = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  is_enabled: boolean;
  report_frequency: "daily" | "weekly";
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedBearer = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (authHeader !== expectedBearer) {
      return NextResponse.json(
        { error: "Unauthorized cron request." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const periodParam = url.searchParams.get("period");
    const period: "daily" | "weekly" =
      periodParam === "weekly" ? "weekly" : "daily";

    const { startDate, endDate } = getDateRange(period);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("report_subscriptions")
      .select("id, user_id, email, full_name, is_enabled, report_frequency")
      .eq("is_enabled", true)
      .eq("report_frequency", period);

    if (subscriptionsError) {
      return NextResponse.json(
        { error: subscriptionsError.message },
        { status: 500 }
      );
    }

    const activeSubscriptions = (subscriptions as SubscriptionRow[] | null) || [];

    if (activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No active ${period} subscriptions found.`,
        sent: 0,
      });
    }

    const sendResults: Array<{
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const subscription of activeSubscriptions) {
      try {
        const response = await fetch(`${origin}/api/reports/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            email: subscription.email,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          sendResults.push({
            email: subscription.email,
            success: false,
            error: result.error || "Failed to send report.",
          });
          continue;
        }

        sendResults.push({
          email: subscription.email,
          success: true,
        });
      } catch (err: any) {
        sendResults.push({
          email: subscription.email,
          success: false,
          error: err.message || "Unexpected send error.",
        });
      }
    }

    const successCount = sendResults.filter((r) => r.success).length;
    const failedCount = sendResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      period,
      startDate,
      endDate,
      totalRecipients: activeSubscriptions.length,
      successCount,
      failedCount,
      results: sendResults,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cron report failed." },
      { status: 500 }
    );
  }
}