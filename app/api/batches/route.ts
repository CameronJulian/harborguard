import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// ✅ Server-side Supabase (secure)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Validation schema
const schema = z.object({
  vessel: z.string().min(1, "Vessel is required"),
  species: z.string().min(1, "Species is required"),
  catchKg: z.number(),
  dockKg: z.number(),
  storageKg: z.number(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Validate input safely
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { vessel, species, catchKg, dockKg, storageKg } = parsed.data;

    // ✅ Risk calculation
    const loss = catchKg - storageKg;
    const lossPercent = catchKg > 0 ? (loss / catchKg) * 100 : 0;

    let riskScore = 0;

    if (lossPercent > 20) riskScore += 50;
    else if (lossPercent > 10) riskScore += 25;
    else if (lossPercent > 5) riskScore += 10;

    if (catchKg > 1000) riskScore += 10;
    if (storageKg < dockKg) riskScore += 10;

    const status =
      riskScore > 70 ? "Flagged" :
      riskScore > 30 ? "Review" :
      "Normal";

    const riskLevel =
      riskScore > 70 ? "High" :
      riskScore > 30 ? "Medium" :
      "Low";

    // ✅ IDs
    const batchCode = `BAT-${Date.now()}`;
    const qrCode = `HG-${batchCode}`;

    // ✅ Insert batch
    const { error: batchError } = await supabase.from("batches").insert({
      batch_code: batchCode,
      vessel,
      species,
      catch_kg: catchKg,
      dock_kg: dockKg,
      storage_kg: storageKg,
      handler_name: "Cameron Hendrick",
      handler_role: "manager",
      location: "Main Warehouse",
      notes: `AI risk score: ${riskScore}`,
      qr_code: qrCode,
      status,
      created_by: null,
    });

    if (batchError) {
      console.error("Batch insert error:", batchError);
      return NextResponse.json(
        { error: batchError.message },
        { status: 500 }
      );
    }

    // ✅ Create incident if high risk
    if (status === "Flagged") {
      const { error: incidentError } = await supabase.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel} / ${species} (Risk Score: ${riskScore})`,
      });

      if (incidentError) {
        console.error("Incident insert error:", incidentError);
      }
    }

    // ✅ Audit log (production feature)
    await supabase.from("audit_logs").insert({
      actor_name: "Cameron Hendrick",
      action: "Created batch",
      batch_code: batchCode,
      risk: riskLevel,
    });

    return NextResponse.json({
      success: true,
      riskScore,
      riskLevel,
    });

  } catch (err: any) {
    console.error("API error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}