import { NextResponse } from "next/server";

import {
  getPayFastMode,
} from "@/lib/payfast/mode";

export const dynamic = "force-dynamic";

export async function GET() {
  const sandboxRaw =
    process.env.PAYFAST_SANDBOX?.trim() ?? "";

  const merchantId =
    process.env.PAYFAST_MERCHANT_ID?.trim() ?? "";

  const merchantKey =
    process.env.PAYFAST_MERCHANT_KEY?.trim() ?? "";

  const passphrase =
    process.env.PAYFAST_PASSPHRASE?.trim() ?? "";

  const payfastMode =
    getPayFastMode();

  return NextResponse.json(
    {
      diagnostic: "payfast-runtime-shape",
      secretsReturned: false,

      payfastMode,

      sandboxRawPresent:
        sandboxRaw.length > 0,

      sandboxExactTrue:
        sandboxRaw === "true",

      sandboxExactFalse:
        sandboxRaw === "false",

      merchantIdPresent:
        merchantId.length > 0,

      merchantIdLength:
        merchantId.length,

      merchantIdAllDigits:
        /^\d+$/.test(merchantId),

      merchantIdExactly8Digits:
        /^\d{8}$/.test(merchantId),

      merchantKeyPresent:
        merchantKey.length > 0,

      merchantKeyLength:
        merchantKey.length,

      passphrasePresent:
        passphrase.length > 0,

      passphraseLength:
        passphrase.length,

      merchantIdHasWhitespace:
        /\s/.test(merchantId),

      merchantKeyHasWhitespace:
        /\s/.test(merchantKey),

      passphraseHasEdgeWhitespace:
        passphrase !== passphrase.trim(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}