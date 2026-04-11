import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const period = body.period === "weekly" ? "weekly" : "daily";

    const cronSecret = process.env.CRON_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(`${siteUrl}/api/reports/cron?period=${period}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to run reports." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Manual report run failed." },
      { status: 500 }
    );
  }
}