import { NextResponse } from "next/server";
import { calculateRiskScore } from "@/lib/risk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const vessel = String(body.vessel || "").trim();
    const species = String(body.species || "").trim();
    const catchValue = Number(body.catchKg);
    const dockValue = Number(body.dockKg);
    const storageValue = Number(body.storageKg);

    if (!vessel || !species) {
      return NextResponse.json(
        { error: "Vessel and species are required." },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(catchValue) ||
      Number.isNaN(dockValue) ||
      Number.isNaN(storageValue)
    ) {
      return NextResponse.json(
        { error: "Catch, Dock, and Storage must be valid numbers." },
        { status: 400 }
      );
    }

    const { data: existingBatches, error: historyError } = await supabase
      .from("batches")
      .select("catch_kg, storage_kg");

    if (historyError) {
      return NextResponse.json(
        { error: `Failed to load batch history: ${historyError.message}` },
        { status: 500 }
      );
    }

    const historicalLosses =
      existingBatches?.map(
        (b) => Number(b.catch_kg || 0) - Number(b.storage_kg || 0)
      ) || [];

    const { loss, riskScore, status, riskLevel } = calculateRiskScore(
      catchValue,
      dockValue,
      storageValue,
      historicalLosses
    );

    const batchCode = `BAT-${Date.now()}`;
    const qrCode = `HG-${batchCode}`;

    const { error: batchError } = await supabase.from("batches").insert({
      batch_code: batchCode,
      vessel,
      species,
      catch_kg: catchValue,
      dock_kg: dockValue,
      storage_kg: storageValue,
      handler_name: "Cameron Hendrick",
      handler_role: "manager",
      location: "Main Warehouse",
      notes: `AI risk score: ${riskScore}`,
      qr_code: qrCode,
      status,
      created_by: null,
    });

    if (batchError) {
      return NextResponse.json(
        { error: `Failed to create batch: ${batchError.message}` },
        { status: 500 }
      );
    }

    if (status === "Flagged") {
      const { error: incidentError } = await supabase.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel} / ${species} (Risk Score: ${riskScore})`,
      });

      if (incidentError) {
        return NextResponse.json(
          { error: `Batch created, but incident failed: ${incidentError.message}` },
          { status: 500 }
        );
      }
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_name: "Cameron Hendrick",
      action: "Created batch",
      batch_code: batchCode,
      risk: riskLevel,
    });

    if (auditError) {
      return NextResponse.json(
        { error: `Batch created, but audit log failed: ${auditError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      batchCode,
      riskScore,
      riskLevel,
      status,
    });
  } catch (error) {
    console.error("API /api/batches error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}