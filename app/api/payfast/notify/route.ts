import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function moneyEquals(actual: string | undefined, expected: string | undefined) {
  const actualValue = Number(actual || 0);
  const expectedValue = Number(expected || 0);

  return Math.abs(actualValue - expectedValue) < 0.01;
}

async function validatePayFastITN(payload: Record<string, string>) {
  const url =
    process.env.PAYFAST_SANDBOX === "true"
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";

  const validationBody = new URLSearchParams(payload).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: validationBody,
  });

  const text = (await response.text()).trim();

  return text === "VALID";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    const isValidPayFastITN = await validatePayFastITN(payload);

    if (!isValidPayFastITN) {
      return NextResponse.json(
        { error: "PayFast validation failed." },
        { status: 400 }
      );
    }

    if (
      process.env.PAYFAST_MERCHANT_ID &&
      payload.merchant_id !== process.env.PAYFAST_MERCHANT_ID
    ) {
      return NextResponse.json(
        { error: "Invalid PayFast merchant." },
        { status: 400 }
      );
    }

    if (
      !moneyEquals(
        payload.amount_gross,
        process.env.PAYFAST_PROFESSIONAL_AMOUNT
      )
    ) {
      return NextResponse.json(
        { error: "Invalid PayFast amount." },
        { status: 400 }
      );
    }

    const organizationId = payload.m_payment_id;
    const payfastPaymentId = payload.pf_payment_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organization ID." },
        { status: 400 }
      );
    }

    if (!payfastPaymentId) {
      return NextResponse.json(
        { error: "Missing PayFast payment ID." },
        { status: 400 }
      );
    }

    const { data: organization, error: organizationLookupError } =
      await supabase
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .maybeSingle();

    if (organizationLookupError) {
      return NextResponse.json(
        { error: organizationLookupError.message },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    const { data: existingInvoice, error: invoiceLookupError } =
      await supabase
        .from("invoices")
        .select("id")
        .eq("payfast_payment_id", payfastPaymentId)
        .maybeSingle();

    if (invoiceLookupError) {
      return NextResponse.json(
        { error: invoiceLookupError.message },
        { status: 500 }
      );
    }

    if (existingInvoice) {
      return NextResponse.json({
        success: true,
        duplicate: true,
      });
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
        return NextResponse.json(
          { error: organizationError.message },
          { status: 500 }
        );
      }

      await supabase.from("billing_events").insert({
        organization_id: organizationId,
        event_type: "subscription_activated",
        provider: "payfast",
        payload,
      });

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: organizationId,
          payfast_payment_id: payfastPaymentId,
          amount: Number(payload.amount_gross || 0),
          currency: payload.currency || "ZAR",
          status: "paid",
          invoice_url: null,
        });

      if (invoiceError) {
        return NextResponse.json(
          { error: invoiceError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook processing failed.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
