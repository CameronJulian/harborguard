import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  vessel: z.string().min(1),
  species: z.string().min(1),
  catchKg: z.number(),
  dockKg: z.number(),
  storageKg: z.number(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vessel, species, catchKg, dockKg, storageKg } = schema.parse(body);

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 403 }
      );
    }

    if (profile.role === "viewer") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

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

    const batchCode = `BAT-${Date.now()}`;
    const qrCode = `HG-${batchCode}`;

    const handlerName = profile.full_name || user.email || "Unknown User";
    const handlerRole = profile.role || "manager";

    const { error: batchError } = await supabase.from("batches").insert({
      batch_code: batchCode,
      vessel,
      species,
      catch_kg: catchKg,
      dock_kg: dockKg,
      storage_kg: storageKg,
      handler_name: handlerName,
      handler_role: handlerRole,
      location: "Main Warehouse",
      notes: `AI risk score: ${riskScore}`,
      qr_code: qrCode,
      status,
      created_by: user.id,
    });

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
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
          { error: incidentError.message },
          { status: 500 }
        );
      }
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_name: handlerName,
      action: "Created batch",
      batch_code: batchCode,
      risk: riskLevel,
    });

    if (auditError) {
      return NextResponse.json(
        { error: auditError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      riskScore,
      riskLevel,
      status,
      batchCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}