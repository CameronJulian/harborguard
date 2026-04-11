import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

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

async function createTrendChart(batches: any[]) {
  const width = 1000;
  const height = 420;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const ordered = [...batches].reverse();

  const labels = ordered.map((b) => b.batch_code?.slice(-4) || "N/A");
  const catchValues = ordered.map((b) => Number(b.catch_kg || 0));
  const storageValues = ordered.map((b) => Number(b.storage_kg || 0));
  const lossValues = ordered.map(
    (b) => Number(b.catch_kg || 0) - Number(b.storage_kg || 0)
  );

  const configuration = {
    type: "line" as const,
    data: {
      labels,
      datasets: [
        {
          label: "Catch",
          data: catchValues,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          tension: 0.3,
        },
        {
          label: "Storage",
          data: storageValues,
          borderColor: "#16a34a",
          backgroundColor: "#16a34a",
          tension: 0.3,
        },
        {
          label: "Loss",
          data: lossValues,
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: true,
        },
        title: {
          display: true,
          text: "Trend Over Time",
          color: "#111827",
          font: {
            size: 18,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#475569",
          },
          grid: {
            color: "#e5e7eb",
          },
        },
        y: {
          ticks: {
            color: "#475569",
          },
          grid: {
            color: "#e5e7eb",
          },
        },
      },
    },
  };

  return chartJSNodeCanvas.renderToBuffer(configuration);
}

async function createStatusChart(batches: any[]) {
  const width = 800;
  const height = 420;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const normalCount = batches.filter((b) => b.status === "Normal").length;
  const reviewCount = batches.filter((b) => b.status === "Review").length;
  const flaggedCount = batches.filter((b) => b.status === "Flagged").length;

  const configuration = {
    type: "bar" as const,
    data: {
      labels: ["Normal", "Review", "Flagged"],
      datasets: [
        {
          label: "Batches",
          data: [normalCount, reviewCount, flaggedCount],
          backgroundColor: ["#2563eb", "#f59e0b", "#dc2626"],
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "Status Distribution",
          color: "#111827",
          font: {
            size: 18,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#475569",
          },
          grid: {
            color: "#e5e7eb",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#475569",
            precision: 0,
          },
          grid: {
            color: "#e5e7eb",
          },
        },
      },
    },
  };

  return chartJSNodeCanvas.renderToBuffer(configuration);
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
  let { width, height } = page.getSize();
  let y = height - 40;

  const margin = 40;
  const lineHeight = 14;

  function newPage() {
    page = pdfDoc.addPage([595, 842]);
    ({ width, height } = page.getSize());
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

  y -= 12;

  if (batches.length > 0) {
    const trendChartBuffer = await createTrendChart(batches);
    const statusChartBuffer = await createStatusChart(batches);

    const trendImage = await pdfDoc.embedPng(trendChartBuffer);
    const statusImage = await pdfDoc.embedPng(statusChartBuffer);

    const trendDims = trendImage.scale(0.45);
    const statusDims = statusImage.scale(0.42);

    ensureSpace(260);
    page.drawImage(trendImage, {
      x: margin,
      y: y - trendDims.height,
      width: trendDims.width,
      height: trendDims.height,
    });
    y -= trendDims.height + 18;

    ensureSpace(240);
    page.drawImage(statusImage, {
      x: margin,
      y: y - statusDims.height,
      width: statusDims.width,
      height: statusDims.height,
    });
    y -= statusDims.height + 20;
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
      subject: `HarborGuard Analytics Report (${startDate} to ${endDate})`,
      html,
      attachments: [
        {
          filename: `harborguard-analytics-${startDate}-to-${endDate}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

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