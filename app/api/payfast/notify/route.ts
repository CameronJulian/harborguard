import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSignature(
  data: Record<string, string>,
  passphrase?: string
) {
  const pfOutput = Object.keys(data)
    .filter((key) => key !== "signature")
    .sort()
    .map(
      (key) =>
        `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`
    )
    .join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase)}`
    : pfOutput;

  return crypto.createHash("md5").update(payload).digest("hex");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    const receivedSignature = payload.signature;

    const generatedSignature = generateSignature(
      payload,
      process.env.PAYFAST_PASSPHRASE
    );

    if (receivedSignature !== generatedSignature) {
      return NextResponse.json(
        { error: "Invalid signature." },
        { status: 400 }
      );
    }

    const organizationId = payload.m_payment_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organization ID." },
        { status: 400 }
      );
    }

    const paymentStatus = payload.payment_status;

    if (paymentStatus === "COMPLETE") {
      await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          plan: "professional",
          payfast_subscription_id: payload.token || null,
          next_billing_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("id", organizationId);

      await supabase.from("billing_events").insert({
        organization_id: organizationId,
        event_type: "subscription_activated",
        payload,
      });

      await supabase.from("invoices").insert({
        organization_id: organizationId,
        provider_payment_id: payload.pf_payment_id,
        amount: Number(payload.amount_gross || 0),
        status: "paid",
        paid_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}