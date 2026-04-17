import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LogRow = {
  id: string;
  subscription_id: string | null;
  user_id: string | null;
  email: string;
  full_name: string | null;
  report_frequency: "daily" | "weekly";
  start_date: string;
  end_date: string;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const logId = body.logId as string | undefined;

    if (!logId) {
      return NextResponse.json(
        { error: "logId is required." },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabase
      .from("report_delivery_logs")
      .select(
        "id, subscription_id, user_id, email, full_name, report_frequency, start_date, end_date, status, error_message, created_at"
      )
      .eq("id", logId)
      .single();

    if (error || !log) {
      return NextResponse.json(
        { error: error?.message || "Log not found." },
        { status: 404 }
      );
    }

    const row = log as LogRow;
    const origin = process.env.NEXT_PUBLIC_SITE_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(`${origin}/api/reports/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        startDate: row.start_date,
        endDate: row.end_date,
        email: row.email,
      }),
    });

    const rawText = await response.text();

    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch {
      result = {
        error: "Non-JSON response returned from /api/reports/send",
        details: rawText.slice(0, 300),
      };
    }

    if (!response.ok || !result?.success) {
      const errorMessage =
        result?.error ||
        result?.details ||
        "Failed to retry report.";

      await supabase.from("report_delivery_logs").insert({
        subscription_id: row.subscription_id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        report_frequency: row.report_frequency,
        start_date: row.start_date,
        end_date: row.end_date,
        status: "failed",
        error_message: errorMessage,
      });

      return NextResponse.json({
        success: false,
        error: errorMessage,
      });
    }

    await supabase.from("report_delivery_logs").insert({
      subscription_id: row.subscription_id,
      user_id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      report_frequency: row.report_frequency,
      start_date: row.start_date,
      end_date: row.end_date,
      status: "success",
      error_message: null,
    });

    return NextResponse.json({
      success: true,
      message: "Report retried successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Retry failed." },
      { status: 500 }
    );
  }
}