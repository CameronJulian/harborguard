import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function wrapText(text: string, maxLength: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines;
}

async function buildAnalyticsPdf(params: {
  startDate: string;
  endDate: string;
  totalCatch: number;
  totalStored: number;
  totalLoss: number;
  flaggedCount: number;
  reviewCount: number;
  openIncidents: number;
  avgLossPercent: number;
  batches: any[];
  incidents: any[];
}) {
  const {
    startDate,
    endDate,
    totalCatch,
    totalStored,
    totalLoss,
    flaggedCount,
    reviewCount,
    openIncidents,
    avgLossPercent,
    batches,
    incidents,
  } = params;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]);
  let { height } = page.getSize();
  let y = height - 40;
  const margin = 40;
  const lineHeight = 14;

  function ensureSpace(required = 24) {
    if (y < required) {
      page = pdfDoc.addPage([595, 842]);
      ({ height } = page.getSize());
      y = height - 40;
    }
  }

  function drawText(
    text: string,
    x: number,
    size = 11,
    bold = false,
    color = rgb(0, 0, 0)
  ) {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? boldFont : font,
      color,
    });
  }

  drawText("HarborGuard Scheduled Analytics Report", margin, 20, true);
  y -= 24;
  drawText(`Reporting Period: ${startDate} to ${endDate}`, margin, 10, false, rgb(0.35, 0.35, 0.35));
  y -= 14;
  drawText(`Generated: ${new Date().toLocaleString()}`, margin, 10, false, rgb(0.35, 0.35, 0.35));
  y -= 24;

  drawText("Summary", margin, 14, true);
  y -= 18;

  const summaryRows = [
    `Total Catch: ${totalCatch} kg`,
    `Total Stored: ${totalStored} kg`,
    `Total Loss: ${totalLoss} kg`,
    `Flagged Batches: ${flaggedCount}`,
    `Review Batches: ${reviewCount}`,
    `Open Incidents: ${openIncidents}`,
    `Average Loss %: ${avgLossPercent.toFixed(1)}%`,
  ];

  for (const row of summaryRows) {
    ensureSpace();
    drawText(`• ${row}`, margin, 11);
    y -= lineHeight;
  }

  y -= 18;
  ensureSpace(80);
  drawText("Recent Batches", margin, 14, true);
  y -= 18;

  const batchHeader = ["Batch", "Vessel", "Species", "Catch", "Storage", "Status"];
  drawText(batchHeader[0], margin, 10, true);
  drawText(batchHeader[1], 140, 10, true);
  drawText(batchHeader[2], 240, 10, true);
  drawText(batchHeader[3], 340, 10, true);
  drawText(batchHeader[4], 400, 10, true);
  drawText(batchHeader[5], 470, 10, true);
  y -= 14;

  for (const b of batches.slice(0, 12)) {
    ensureSpace(70);
    drawText(String(b.batch_code ?? ""), margin, 9);
    drawText(String(b.vessel ?? ""), 140, 9);
    drawText(String(b.species ?? ""), 240, 9);
    drawText(String(b.catch_kg ?? ""), 340, 9);
    drawText(String(b.storage_kg ?? ""), 400, 9);
    drawText(String(b.status ?? ""), 470, 9);
    y -= 12;
  }

  y -= 20;
  ensureSpace(100);
  drawText("Recent Incidents", margin, 14, true);
  y -= 18;

  for (const i of incidents.slice(0, 8)) {
    ensureSpace(90);
    drawText(`${i.incident_code ?? ""} | ${i.severity ?? ""} | ${i.status ?? ""}`, margin, 10, true);
    y -= 14;

    const wrapped = wrapText(String(i.summary ?? ""), 85);
    for (const line of wrapped.slice(0, 3)) {
      ensureSpace(30);
      drawText(line, margin + 10, 9, false, rgb(0.2, 0.2, 0.2));
      y -= 11;
    }

    drawText(formatDateTime(i.created_at), margin + 10, 8, false, rgb(0.4, 0.4, 0.4));
    y -= 18;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

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

export async function GET(req: NextRequest) {
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

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendKey);

    const periodParam = req.nextUrl.searchParams.get("period");
    const email = req.nextUrl.searchParams.get("email");

    const period: "daily" | "weekly" =
      periodParam === "weekly" ? "weekly" : "daily";

    if (!email) {
      return NextResponse.json(
        { error: "Missing email query parameter." },
        { status: 400 }
      );
    }

    const { startDate, endDate } = getDateRange(period);
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;

    const { data: batches, error: batchesError } = await supabase
      .from("batches")
      .select("batch_code, vessel, species, catch_kg, storage_kg, status, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (batchesError) {
      return NextResponse.json({ error: batchesError.message }, { status: 500 });
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("incident_code, severity, status, summary, created_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
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

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2 style="margin-bottom:8px;">HarborGuard Scheduled Analytics Report</h2>
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

        <p style="margin-top:24px;color:#6b7280;">
          Generated automatically by HarborGuard scheduled reporting.
        </p>
      </div>
    `;

    const pdfBuffer = await buildAnalyticsPdf({
      startDate,
      endDate,
      totalCatch,
      totalStored,
      totalLoss,
      flaggedCount,
      reviewCount,
      openIncidents,
      avgLossPercent,
      batches: safeBatches,
      incidents: safeIncidents,
    });

    const emailResult = await resend.emails.send({
      from: "HarborGuard <onboarding@resend.dev>",
      to: email,
      subject: `HarborGuard Scheduled Report (${startDate} to ${endDate})`,
      html,
      attachments: [
        {
          filename: `harborguard-scheduled-report-${startDate}-to-${endDate}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      period,
      startDate,
      endDate,
      email,
      emailResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Scheduled report failed." },
      { status: 500 }
    );
  }
}