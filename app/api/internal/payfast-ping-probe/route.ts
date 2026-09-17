import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  buildPayFastApiHeaders,
  formatPayFastApiTimestamp,
} from "@/lib/payfast/api";

import {
  getPayFastMode,
} from "@/lib/payfast/mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization =
    request.headers.get("authorization");

  const token =
    authorization
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (!token) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        providerRequestSent: false,
      },
      { status: 401 }
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Server authentication configuration unavailable.",
        providerRequestSent: false,
      },
      { status: 503 }
    );
  }

  const supabase =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        providerRequestSent: false,
      },
      { status: 401 }
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profile unavailable",
        providerRequestSent: false,
      },
      { status: 403 }
    );
  }

  const allowedRole =
    ["owner", "admin", "manager"]
      .includes(
        String(profile.role)
          .toLowerCase()
      );

  if (!allowedRole) {
    return NextResponse.json(
      {
        error: "Forbidden",
        providerRequestSent: false,
      },
      { status: 403 }
    );
  }

  const payfastMode =
    getPayFastMode();

  if (payfastMode !== "sandbox") {
    return NextResponse.json(
      {
        error:
          "PayFast ping probe is sandbox-only.",
        providerRequestSent: false,
      },
      { status: 409 }
    );
  }

  const merchantId =
    process.env.PAYFAST_MERCHANT_ID
      ?.trim();

  const passphrase =
    process.env.PAYFAST_PASSPHRASE
      ?.trim();

  if (!merchantId || !passphrase) {
    return NextResponse.json(
      {
        error:
          "PayFast API credentials unavailable.",
        providerRequestSent: false,
      },
      { status: 503 }
    );
  }

  const timestamp =
    formatPayFastApiTimestamp();

  const signedRequestHeaders =
    buildPayFastApiHeaders({
      merchantId,
      passphrase,
      timestamp,
    });

  const providerResponse =
    await fetch(
      "https://api.payfast.co.za/ping?testing=true",
      {
        method: "GET",
        headers: signedRequestHeaders,
        cache: "no-store",
      }
    );

  const providerResponseText =
    await providerResponse.text();

  const providerContentType =
    providerResponse.headers.get(
      "content-type"
    ) ?? "";

  return NextResponse.json(
    {
      probe:
        "payfast-api-ping",

      readOnly:
        true,

      secretsReturned:
        false,

      payfastMode,

      authenticated:
        true,

      providerRequestSent:
        true,

      providerMethod:
        "GET",

      providerStatus:
        providerResponse.status,

      providerOk:
        providerResponse.ok,

      providerBodyPresent:
        providerResponseText.length > 0,

      providerBodyLength:
        providerResponseText.length,

      providerContentTypeJson:
        providerContentType
          .toLowerCase()
          .includes(
            "application/json"
          ),

      providerUnauthorized:
        providerResponse.status === 401,

      providerForbidden:
        providerResponse.status === 403,
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