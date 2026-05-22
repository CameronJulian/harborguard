import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/audit";

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
    .filter((key) => data[key] !== "")
    .map(
      (key) =>
        `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}`
    )
    .join("&");

  const payload = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase.trim()).replace(
        /%20/g,
        "+"
      )}`
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
    const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();

    const generatedSignature = generateSignature(payload, passphrase);

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
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          plan: "professional",
          trial_ends_at: null,
          payfast_subscription_id:
            payload.token ||
            payload.subscription_id ||
            null,
          next_billing_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) {
        return NextResponse.json(
          {
            error: `Failed to activate subscription: ${updateError.message}`,
          },
          { status: 500 }
        );
      }

      await createAuditLog({
        organizationId,
        userId: null,
        action: "billing.subscription.activated",
        target: "professional-plan",
        metadata: {
          provider: "payfast",
          paymentStatus,
          pfPaymentId: payload.pf_payment_id || null,
          subscriptionId:
            payload.token ||
            payload.subscription_id ||
            null,
          amountGross: payload.amount_gross || null,
          amountFee: payload.amount_fee || null,
          amountNet: payload.amount_net || null,
          activatedAt: new Date().toISOString(),
        },
      });

      await supabase.from("billing_events").insert({
        organization_id: organizationId,
        event_type: "subscription_activated",
        payload,
      });

      await supabase.from("invoices").insert({
        organization_id: organizationId,
        provider_payment_id: payload.pf_payment_id || null,
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