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

 