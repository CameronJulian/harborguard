import { NextResponse } from "next/server";
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function drawLineChart(params: {
  page: any;
  x: number;
  y: number;
  width: number;
  height: number;
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
    color: ReturnType<typeof rgb>;
  }>;
  title: string;
  font: any;
  boldFont: any;
}) {
  const { page, x, y, width, height, labels, series, title, font, boldFont } = params;

  page.drawText(title, {
    x,
    y: y + height + 20,
    size: 14,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.12),
  });

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.9, 0.92, 0.95),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(...allValues, 1);

  page.drawLine({
    start: { x: x + 30, y: y + 25 },
    end: { x: x + 30, y: y + height - 20 },
    thickness: 1,
    color: rgb(0.8, 0.84, 0.88),
  });

  page.drawLine({
    start: { x: x + 30, y: y + 25 },
    end: { x: x + width - 15, y: y + 25 },
    thickness: 1,
    color: rgb(0.8, 0.84, 0.88),
  });

  const innerWidth = width - 50;
  const innerHeight = height - 50;

  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    const points = s.values.map((value, index) => {
      const px =
        x + 30 + (labels.length <= 1 ? innerWidth / 2 : (index / (labels.length - 1)) * innerWidth);
      const py = y + 25 + (value / maxValue) * innerHeight;
      return { x: px, y: py };
    });

    for (let j = 0; j < points.length - 1; j++) {
      page.drawLine({
        start: points[j],
        end: points[j + 1],
        thickness: 2,
        color: s.color,
      });
    }

    for (const point of points) {
      page.drawCircle({
        x: point.x,
        y: point.y,
        size: 2.5,
        color: s.color,
      });
    }

    page.drawText(s.name, {
      x: x + 10 + i * 90,
      y: y + height - 10,
      size: 9,
      font,
      color: s.color,
    });
  }

  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  for (let i = 0; i < labels.length; i += labelStep) {
    const px =
      x + 30 + (labels.length <= 1 ? innerWidth / 2 : (i / (labels.length - 1)) * innerWidth);

    page.drawText(labels[i], {
      x: px - 10,
      y: y + 10,
      size: 8,
      font,
      color: rgb(0.35, 0.4, 0.47),
    });
  }
}

function drawBarChart(params: {
  page: any;
  x: number;
  y: number;
  width: number;
  height: number;
  labels: string[];
  values: number[];
  colors: ReturnType<typeof rgb>[];
  title: string;
  font: any;
  boldFont: any;
}) {
  const { page, x, y, width, height, labels, values, colors, title, font, boldFont } = params;

  page.drawText(title, {
    x,
    y: y + height + 20,
    size: 14,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.12),
  });

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.9, 0.92, 0.95),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const maxValue = Math.max(...values, 1);
  const innerHeight = height - 45;
  const barWidth = Math.min(60, (width - 60) / Math.max(values.length, 1) - 20);

  for (let i = 0; i < values.length; i++) {
    const barHeight = (values[i] / maxValue) * innerHeight;
    const bx = x + 30 + i * ((width - 60) / values.length) + 10;
    const by = y + 25;

    page.drawRectangle({
      x: bx,
      y: by,
      width: barWidth,
      height: barHeight,
      color: colors[i],
    });

    page.drawText(String(values[i]), {
      x: bx + 8,
      y: by + barHeight + 4,
      size: 9,
      font,
      color: rgb(0.2, 0.23, 0.28),
    });

    page.drawText(labels[i], {
      x: bx,
      y: y + 8,
      size: 8,
      font,
      color: rgb(0.35, 0.4, 0.47),
    });
  }
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

  function newPage() {
    page = pdfDoc.addPage([595, 842]);
    ({ height } = page.getSize());
    y = height - 40;
  }

  function ensureSpace(required = 24) {
    if (y < required) {
      newPage();
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

  drawText("HarborGuard Analytics Report", margin, 20, true);
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

  if (batches.length > 0) {
    const ordered = [...batches].reverse();
    const labels = ordered.map((b) => b.batch_code?.slice(-4) || "N/A");
    const catchValues = ordered.map((b) => Number(b.catch_kg || 0));
    const storageValues = ordered.map((b) => Number(b.storage_kg || 0));
    const lossValues = ordered.map(
      (b) => Number(b.catch_kg || 0) - Number(b.storage_kg || 0)
    );

    ensureSpace(280);
    drawLineChart({
      page,
      x: margin,
      y: y - 220,
      width: 500,
      height: 200,
      labels,
      series: [
        { name: "Catch", values: catchValues, color: rgb(0.15, 0.39, 0.92) },
        { name: "Storage", values: storageValues, color: rgb(0.09, 0.64, 0.29) },
        { name: "Loss", values: lossValues, color: rgb(0.96, 0.62, 0.04) },
      ],
      title: "Trend Over Time",
      font,
      boldFont,
    });
    y -= 250;

    ensureSpace(240);
    drawBarChart({
      page,
      x: margin,
      y: y - 180,
      width: 320,
      height: 160,
      labels: ["Normal", "Review", "Flagged"],
      values: [
        batches.filter((b) => b.status === "Normal").length,
        batches.filter((b) => b.status === "Review").length,
        batches.filter((b) => b.status === "Flagged").length,
      ],
      colors: [rgb(0.15, 0.39, 0.92), rgb(0.96, 0.62, 0.04), rgb(0.86, 0.15, 0.15)],
      title: "Status Distribution",
      font,
      boldFont,
    });
    y -= 210;
  }

  ensureSpace(100);
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

export async function POST(req: Request) {
  try {
    const resendKey = process.env.RESEND_API_KEY;

    if (!resendKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { startDate, endDate, email } = body ?? {};

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
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.batch_code)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.vessel)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.species)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.catch_kg)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.storage_kg)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(b.status)}</td>
          </tr>
        `
      )
      .join("");

    const incidentRows = safeIncidents
      .slice(0, 10)
      .map(
        (i) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.incident_code)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.severity)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.status)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.summary)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2 style="margin-bottom:8px;">HarborGuard Analytics Report</h2>
        <p style="color:#6b7280;margin-top:0;">
          Reporting period: <strong>${escapeHtml(startDate)}</strong> to <strong>${escapeHtml(endDate)}</strong>
        </p>

        <h3>Summary</h3>
        <ul>
          <li>Total Catch: <strong>${escapeHtml(totalCatch)} kg</strong></li>
          <li>Total Stored: <strong>${escapeHtml(totalStored)} kg</strong></li>
          <li>Total Loss: <strong>${escapeHtml(totalLoss)} kg</strong></li>
          <li>Flagged Batches: <strong>${escapeHtml(flaggedCount)}</strong></li>
          <li>Review Batches: <strong>${escapeHtml(reviewCount)}</strong></li>
          <li>Open Incidents: <strong>${escapeHtml(openIncidents)}</strong></li>
          <li>Average Loss %: <strong>${escapeHtml(avgLossPercent.toFixed(1))}%</strong></li>
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
            ${
              batchRows ||
              `<tr><td colspan="6" style="padding:8px;border:1px solid #ddd;">No batches in selected period.</td></tr>`
            }
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
            ${
              incidentRows ||
              `<tr><td colspan="4" style="padding:8px;border:1px solid #ddd;">No incidents in selected period.</td></tr>`
            }
          </tbody>
        </table>

        <p style="margin-top:24px;color:#6b7280;">
          Generated automatically by HarborGuard.
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

    let emailResult: any;
    try {
      emailResult = await resend.emails.send({
        from: "HarborGuard <onboarding@resend.dev>",
        to: email,
        subject: `HarborGuard Analytics Report (${startDate} to ${endDate})`,
        html,
        attachments: [
          {
            filename: `harborguard-analytics-${startDate}-to-${endDate}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Failed to send email via Resend." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email report with PDF attachment sent successfully.",
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