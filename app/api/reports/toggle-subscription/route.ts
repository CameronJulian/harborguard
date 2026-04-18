import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { subscriptionId, isEnabled } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("report_subscriptions")
      .update({ is_enabled: !isEnabled })
      .eq("id", subscriptionId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newState: !isEnabled,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Toggle failed." },
      { status: 500 }
    );
  }
}