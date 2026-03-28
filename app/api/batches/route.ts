import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// ✅ Server client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Validation
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

    // ✅ Get user from request (IMPORTANT)
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // ✅ Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role === "viewer") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // ✅ Risk logic
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

    // ✅ Insert batch
    const { error } = await supabase.from("batches").insert({
      batch_code: `BAT-${Date.now()}`,
      vessel,
      species,
      catch_kg: catchKg,
      dock_kg: dockKg,
      storage_kg: storageKg,
      status,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ✅ Create incident if needed
    if (status === "Flagged") {
      await supabase.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel}`,
      });
    }

    return NextResponse.json({
      success: true,
      riskScore,
      riskLevel,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}