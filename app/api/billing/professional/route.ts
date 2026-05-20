import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrganization } from "@/lib/server-auth";

const PAYFAST_URL =
  process.env.PAYFAST_SANDBOX === "true"
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";

function generateSignature(data: Record<string, string>, passphrase?: string) {
  const pfOutput = Object.keys(data)
    .filter((key) => data[key] !== "")
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
    const { organizationId, supabase } = await requireOrganization();

    const body = await req.json();

    const billingEmail = body.billingEmail;

    if (!billingEmail) {
      return NextResponse.json(
        { error: "Billing email required." },
        { status: 400 }
      );
    }

    const merchantId = process.env.PAYFAST_MERCHANT_ID!;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY!;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    const paymentData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,

      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payfast/notify`,

      name_first: "HarborGuard",
      name_last: "Customer",
      email_address: billingEmail,

      m_payment_id: organizationId,

      amount: "499.00",
      item_name: "HarborGuard Professional",
      item_description: "Fleet Intelligence Subscription",

      subscription_type: "1",
      billing_date: new Date().toISOString().split("T")[0],
      recurring_amount: "499.00",
      frequency: "3",
      cycles: "0",
    };

    const signature = generateSignature(paymentData, passphrase);

    const paymentUrl =
      `${PAYFAST_URL}?` +
      new URLSearchParams({
        ...paymentData,
        signature,
      }).toString();

    await supabase
      .from("organizations")
      .update({
        billing_email: billingEmail,
      })
      .eq("id", organizationId);

    return NextResponse.json({
      success: true,
      paymentUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to create subscription session.",
      },
      { status: 500 }
    );
  }
}