import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        vehicle_id,
        trip_id,
        alert_type,
        severity,
        message,
        is_resolved,
        created_at,
        resolved_at,
        resolution_notes,
        vehicle:vehicles (
          nickname,
          registration_number
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alerts: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load vehicle alerts." },
      { status: 500 }
    );
  }
}