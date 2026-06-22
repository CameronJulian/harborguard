import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((v) => v.replace(/^"|"$/g, ""));
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const text = await req.text();
    const lines = text.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must include a header row and at least one data row." },
        { status: 400 }
      );
    }

    const headers = parseCsvLine(lines[0]);

    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const record: Record<string, string> = {};

      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });

      return {
        organization_id: organizationId,
        type: record.type,
        title: record.title,
        description: record.description || null,
        latitude: Number(record.latitude),
        longitude: Number(record.longitude),
        radius_meters: Number(record.radius_meters || 1000),
        severity: record.severity || "medium",
        source: record.source || "csv_import",
        status: "active",
        expires_at: record.expires_at || null,
        verified_at: new Date().toISOString(),
      };
    });

    const invalidRows = rows.filter(
      (row) =>
        !row.type ||
        !row.title ||
        Number.isNaN(row.latitude) ||
        Number.isNaN(row.longitude)
    );

    if (invalidRows.length > 0) {
      return NextResponse.json(
        { error: "CSV contains invalid rows.", invalidRows },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("route_safety_alerts")
      .insert(rows)
      .select("id, type, title, severity");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      alerts: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "CSV import failed." },
      { status: 500 }
    );
  }
}
