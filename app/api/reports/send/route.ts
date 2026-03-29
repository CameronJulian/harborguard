import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { startDate, endDate, email } = body;

    if (!startDate || !endDate || !email) {
      return NextResponse.json(
        { error: "startDate, endDate, and email are required." },
        { status: 400 }
      );
    }

    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;

    const { data: batches, error: batchesError } = await supabase
      .from("batches")
      .select("batch_code, vessel, species, catch_kg, storage_kg, status, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (batchesError) {
      return NextResponse.json(
        { error: batchesError.message },
        { status: 500 }
      );
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("incident_code, severity, status, summary, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (incidentsError) {
      return NextResponse.json(
        { error: incidentsError.message },
        { status: 500 }
      );
    }

    const safeBatches = batches || [];
    const safeIncidents = incidents || [];

    const totalCatch = safeBatches.reduce(
      (sum, b) => sum + Number(b.catch_kg || 0),
      0
    );

    const totalStored = safeBatches.reduce(
      (sum, b) => sum + Number(b.storage_kg || 0),
      0
    );

    const totalLoss = totalCatch - totalStored;
    const flaggedCount = safeBatches.filter((b) => b.status === "Flagged").length;
    const reviewCount = safeBatches.filter((b) => b.status === "Review").length;
    const openIncidents = safeIncidents.filter((i) => i.status === "Open").length;

    const avgLossPercent =
      safeBatches.length > 0
        ? safeBatches.reduce((sum, b) => {
            const catchValue = Number(b.catch_kg || 0);
            const storageValue = Number(b.storage_kg || 0);
            if (catchValue <= 0) return sum;
            return sum + ((catchValue - storageValue) / catchValue) * 100;
          }, 0) / safeBatches.length
        : 0;

    const batchRows = safeBatches
      .slice(0, 10)
      .map(
        (b) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${b.batch_code ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.vessel ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.species ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.catch_kg ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.storage_kg ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${b.status ?? ""}</td>
          </tr>
        `
      )
      .join("");

    const incidentRows = safeIncidents
      .slice(0, 10)
      .map(
        (i) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${i.incident_code ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${i.severity ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${i.status ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;">${i.summary ?? ""}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2 style="margin-bottom:8px;">HarborGuard Analytics Report</h2>
        <p style="color:#6b7280;margin-top:0;">
          Reporting period: <strong>${startDate}</strong> to <strong>${endDate}</strong>
        </p>

        <h3>Summary</h3>
        <ul>
          <li>Total Catch: <strong>${totalCatch} kg</strong></li>
          <li>Total Stored: <strong>${totalStored} kg</strong></li>
          <li>Total Loss: <strong>${totalLoss} kg</strong></li>
          <li>Flagged Batches: <strong>${flaggedCount}</strong></li>
          <li>Review Batches: <strong>${reviewCount}</strong></li>
          <li>Open Incidents: <strong>${openIncidents}</strong></li>
          <li>Average Loss %: <strong>${avgLossPercent.toFixed(1)}%</strong></li>
        </ul>

        <h3>Recent Batches</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Batch</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Vessel</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Species</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Catch</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Storage</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${batchRows || `<tr><td colspan="6" style="padding:8px;border:1px solid #ddd;">No batches in selected period.</td></tr>`}
          </tbody>
        </table>

        <h3>Recent Incidents</h3>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Incident</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Severity</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Summary</th>
            </tr>
          </thead>
          <tbody>
            ${incidentRows || `<tr><td colspan="4" style="padding:8px;border:1px solid #ddd;">No incidents in selected period.</td></tr>`}
          </tbody>
        </table>

        <p style="margin-top:24px;color:#6b7280;">
          Generated automatically by HarborGuard.
        </p>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: "HarborGuard <onboarding@resend.dev>",
      to: email,
      subject: `HarborGuard Analytics Report (${startDate} to ${endDate})`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Email report sent successfully.",
      emailResult,
    });
  } catch (err: any) {
    console.error("REPORT SEND ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Failed to send email report." },
      { status: 500 }
    );
  }
}