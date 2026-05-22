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
  const filteredData = Object.entries(data).filter(
    ([key, value]) =>
      key !== "signature" &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  const pfOutput = filteredData
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, "+")}`
    )
    .join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(
        passphrase.trim()
      ).replace(/%20/g, "+")}`
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

    console.log("PAYFAST PAYLOAD:", payload);

    const receivedSignature = payload.signature;
    const generatedSignature = generateSignature(
      payload,
      process.env.PAYFAST_PASSPHRASE
    );

    const signaturesMatch =
      receivedSignature?.trim().toLowerCase() ===
      generatedSignature.trim().toLowerCase();

    if (!signaturesMatch) {
      console.error("INVALID SIGNATURE");

      if (process.env.PAYFAST_SANDBOX !== "true") {
        return NextResponse.json(
          { error: "Invalid signature." },
          { status: 400 }
        );
      }

      console.warn(
        "SANDBOX MODE: allowing PayFast ITN despite signature mismatch"
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
      const { error: organizationError } = await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          plan: "professional",
          trial_ends_at: null,
          payfast_subscription_id: payload.token || null,
          next_billing_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("id", organizationId);

      if (organizationError) {
        console.error("ORGANIZATION UPDATE ERROR:", organizationError);

        return NextResponse.json(
          { error: organizationError.message },
          { status: 500 }
        );
      }

      const { error: billingEventError } = await supabase
        .from("billing_events")
        .insert({
          organization_id: organizationId,
          event_type: "subscription_activated",
          provider: "payfast",
          payload,
        });

      if (billingEventError) {
        console.error("BILLING EVENT ERROR:", billingEventError);
      }

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: organizationId,
          provider_payment_id: payload.pf_payment_id || null,
          amount: Number(payload.amount_gross || 0),
          status: "paid",
          paid_at: new Date().toISOString(),
        });

      if (invoiceError) {
        console.error("INVOICE ERROR:", invoiceError);
      }

      console.log("SUBSCRIPTION ACTIVATED");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PAYFAST WEBHOOK ERROR:", err);

    return NextResponse.json(
      {
        error: err.message || "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}