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
  const filtered = Object.entries(data)
    .filter(([key, value]) =>
      key !== "signature" &&
      value !== undefined &&
      value !== null &&
      value !== ""
    )
    

  const queryString = filtered
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`
    )
    .join("&");

  const payload = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase.trim())}`
    : queryString;

  return crypto
    .createHash("md5")
    .update(payload)
    .digest("hex");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    console.log("PAYFAST PAYLOAD:", payload);

    const receivedSignature = payload.signature;

    const generatedSignature = generateSignature(
      payload,
      process.env.PAYFAST_PASSPHRASE
    );

    console.log("RECEIVED:", receivedSignature);
    console.log("GENERATED:", generatedSignature);

    if (
      receivedSignature?.trim().toLowerCase() !==
      generatedSignature.trim().toLowerCase()
    ) {
      console.error("INVALID SIGNATURE");

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

    if (payload.payment_status === "COMPLETE") {
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

      console.log("SUBSCRIPTION ACTIVATED");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error: err.message || "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}