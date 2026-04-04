import { NextResponse } from "next/server";

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
    const email = url.searchParams.get("email");

    const period: "daily" | "weekly" =
      periodParam === "weekly" ? "weekly" : "daily";

    if (!email) {
      return NextResponse.json(
        { error: "Missing email query parameter." },
        { status: 400 }
      );
    }

    const { startDate, endDate } = getDateRange(period);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      url.origin;

    const response = await fetch(`${origin}/api/reports/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        email,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to send scheduled report." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      period,
      startDate,
      endDate,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cron report failed." },
      { status: 500 }
    );
  }
}