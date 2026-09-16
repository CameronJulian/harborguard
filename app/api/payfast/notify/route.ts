import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { PROFESSIONAL_MONTHLY_AMOUNT } from "@/lib/billing";
import { getPayFastValidationUrl } from "@/lib/payfast/mode";
import { verifyPayFastSignature } from "@/lib/payfast/signature";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PAYFAST_ITN_BYTES = 32 * 1024;

class PayFastPayloadTooLargeError extends Error {}

async function readPayFastItnBody(
  request: Request
) {
  const contentLengthHeader =
    request.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength =
      Number(contentLengthHeader);

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_PAYFAST_ITN_BYTES
    ) {
      throw new PayFastPayloadTooLargeError(
        "PayFast ITN payload too large."
      );
    }
  }

  if (!request.body) {
    return "";
  }

  const reader =
    request.body.getReader();

  const chunks: Uint8Array[] = [];

  let totalBytes = 0;

  while (true) {
    const { done, value } =
      await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;

    if (
      totalBytes >
      MAX_PAYFAST_ITN_BYTES
    ) {
      await reader.cancel();

      throw new PayFastPayloadTooLargeError(
        "PayFast ITN payload too large."
      );
    }

    chunks.push(value);
  }

  const body =
    new Uint8Array(totalBytes);

  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

function moneyEquals(actual: string | undefined, expected: string | undefined) {
  const actualValue = Number(actual || 0);
  const expectedValue = Number(expected || 0);

  return Math.abs(actualValue - expectedValue) < 0.01;
}

async function validatePayFastITN(payload: Record<string, string>) {
  const url =
    getPayFastValidationUrl();

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

    const rawBody =
      await readPayFastItnBody(req);

    const formData =
      new URLSearchParams(rawBody);

    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value;
    });

    const payFastPassphrase =
      process.env.PAYFAST_PASSPHRASE?.trim();

    if (
      !verifyPayFastSignature(
        payload,
        payFastPassphrase
      )
    ) {
      console.warn("PAYFAST_ITN_REJECTED=INVALID_SIGNATURE");

      return NextResponse.json(
        { error: "Invalid PayFast signature." },
        { status: 400 }
      );
    }
    const isValidPayFastITN = await validatePayFastITN(payload);

    if (!isValidPayFastITN) {
      console.warn("PAYFAST_ITN_REJECTED=REMOTE_VALIDATION_FAILED");

      return NextResponse.json(
        { error: "PayFast validation failed." },
        { status: 400 }
      );
    }

    if (
      process.env.PAYFAST_MERCHANT_ID &&
      payload.merchant_id !== process.env.PAYFAST_MERCHANT_ID
    ) {
      console.warn("PAYFAST_ITN_REJECTED=INVALID_MERCHANT");

      return NextResponse.json(
        { error: "Invalid PayFast merchant." },
        { status: 400 }
      );
    }

    if (
      !moneyEquals(
        payload.amount_gross,
        PROFESSIONAL_MONTHLY_AMOUNT
      )
    ) {
      console.warn("PAYFAST_ITN_REJECTED=INVALID_AMOUNT");

      return NextResponse.json(
        { error: "Invalid PayFast amount." },
        { status: 400 }
      );
    }

    const organizationId = payload.m_payment_id;
    const payfastPaymentId = payload.pf_payment_id;

    if (!organizationId) {
      console.warn("PAYFAST_ITN_REJECTED=MISSING_ORGANIZATION_ID");

      return NextResponse.json(
        { error: "Missing organization ID." },
        { status: 400 }
      );
    }

    if (!payfastPaymentId) {
      console.warn("PAYFAST_ITN_REJECTED=MISSING_PAYMENT_ID");

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
      console.error(
        "PayFast ITN organization lookup failed:",
        organizationLookupError
      );

      return NextResponse.json(
        { error: "Webhook processing failed." },
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
      console.error(
        "PayFast ITN invoice lookup failed:",
        invoiceLookupError
      );

      return NextResponse.json(
        { error: "Webhook processing failed." },
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
      const nextBillingDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const {
        data: activationRows,
        error: activationError,
      } = await supabase.rpc(
        "activate_payfast_subscription_atomically",
        {
          p_organization_id: organizationId,
          p_payfast_payment_id: payfastPaymentId,
          p_payfast_subscription_id: payload.token || null,
          p_next_billing_date: nextBillingDate,
          p_amount: Number(payload.amount_gross || 0),
          p_currency: payload.currency || "ZAR",
          p_payload: payload,
          p_raw_payload: rawBody,
        }
      );

      if (activationError) {
        console.error(
          "PayFast ITN atomic activation failed:",
          activationError
        );

        return NextResponse.json(
          { error: "Webhook processing failed." },
          { status: 500 }
        );
      }

      const activation =
        Array.isArray(activationRows)
          ? activationRows[0]
          : activationRows;

      if (activation?.duplicate === true) {
        return NextResponse.json({
          success: true,
          duplicate: true,
        });
      }

      if (activation?.processed !== true) {
        console.error(
          "PayFast ITN atomic activation returned an invalid result."
        );

        return NextResponse.json(
          { error: "Webhook processing failed." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (
      err instanceof PayFastPayloadTooLargeError
    ) {
      return NextResponse.json(
        { error: err.message },
        { status: 413 }
      );
    }

    console.error("PayFast ITN processing failed:", err);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}

