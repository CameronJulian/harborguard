import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type FailedLogRow = {
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

export async function POST() {
  try {
    const { data: failedLogs, error } = await supabase
      .from("report_delivery_logs")
      .select(
        "id, subscription_id, user_id, email, full_name, report_frequency, start_date, end_date, status, error_message, created_at"
      )
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!failedLogs || failedLogs.length === 0) {
      return NextResponse.json({
        success: true,
        retried: 0,
        results: [],
        message: "No failed logs to retry.",
      });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not configured." },
        { status: 500 }
      );
    }

    const results: Array<{
      logId: string;
      email: string;
      success: boolean;
      error?: string | null;
    }> = [];

    for (const log of failedLogs as FailedLogRow[]) {
      try {
        const response = await fetch(`${origin}/api/reports/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            startDate: log.start_date,
            endDate: log.end_date,
            email: log.email,
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

          results.push({
            logId: log.id,
            email: log.email,
            success: false,
            error: errorMessage,
          });

          await supabase.from("report_delivery_logs").insert({
            subscription_id: log.subscription_id,
            user_id: log.user_id,
            email: log.email,
            full_name: log.full_name,
            report_frequency: log.report_frequency,
            start_date: log.start_date,
            end_date: log.end_date,
            status: "failed",
            error_message: errorMessage,
          });

          continue;
        }

        results.push({
          logId: log.id,
          email: log.email,
          success: true,
          error: null,
        });

        await supabase.from("report_delivery_logs").insert({
          subscription_id: log.subscription_id,
          user_id: log.user_id,
          email: log.email,
          full_name: log.full_name,
          report_frequency: log.report_frequency,
          start_date: log.start_date,
          end_date: log.end_date,
          status: "success",
          error_message: null,
        });
      } catch (err: any) {
        const errorMessage = err.message || "Retry failed.";

        results.push({
          logId: log.id,
          email: log.email,
          success: false,
          error: errorMessage,
        });

        await supabase.from("report_delivery_logs").insert({
          subscription_id: log.subscription_id,
          user_id: log.user_id,
          email: log.email,
          full_name: log.full_name,
          report_frequency: log.report_frequency,
          start_date: log.start_date,
          end_date: log.end_date,
          status: "failed",
          error_message: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      retried: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Retry failed." },
      { status: 500 }
    );
  }
}