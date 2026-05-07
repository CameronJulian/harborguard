import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      incidents: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load road incidents." },
      { status: 500 }
    );
  }
}