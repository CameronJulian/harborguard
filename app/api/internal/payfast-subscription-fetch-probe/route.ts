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
      ?.replace("Bearer ", "")
      .trim();

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
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
          "Server Supabase configuration unavailable.",
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
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "organization_id, role"
      )
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile?.organization_id
  ) {
    return NextResponse.json(
      {
        error:
          "Organization profile unavailable.",
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
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const {
    data: organization,
    error: organizationError,
  } =
    await supabase
      .from("organizations")
      .select(
        "payfast_subscription_id"
      )
      .eq(
        "id",
        profile.organization_id
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return NextResponse.json(
      {
        error:
          "Organization unavailable.",
      },
      { status: 404 }
    );
  }

  const subscriptionId =
    String(
      organization.payfast_subscription_id ??
      ""
    ).trim();

  if (!subscriptionId) {
    return NextResponse.json(
      {
        error:
          "PayFast subscription identity unavailable.",
      },
      { status: 409 }
    );
  }

  const payfastMode =
    getPayFastMode();

  if (payfastMode !== "sandbox") {
    return NextResponse.json(
      {
        error:
          "Read-only probe is sandbox-only.",
        payfastMode,
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

  const headers =
    buildPayFastApiHeaders({
      merchantId,
      passphrase,
      timestamp,
    });

  const encodedToken =
    encodeURIComponent(
      subscriptionId
    );

  /*
   * Read-only PayFast subscription fetch.
   *
   * No cancellation endpoint is called.
   * No HarborGuard database mutation occurs.
   * Provider response body is deliberately not
   * returned to avoid exposing provider data.
   */
  const payfastUrl =
    `https://api.payfast.co.za/subscriptions/${encodedToken}/fetch?testing=true`;

  const providerResponse =
    await fetch(
      payfastUrl,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

  const providerBody =
    await providerResponse.text();

  const contentType =
    providerResponse.headers.get(
      "content-type"
    ) ?? "";

  return NextResponse.json(
    {
      probe:
        "payfast-subscription-fetch",

      readOnly:
        true,

      secretsReturned:
        false,

      payfastMode,

      providerRequestSent:
        true,

      providerMethod:
        "GET",

      providerStatus:
        providerResponse.status,

      providerOk:
        providerResponse.ok,

      providerBodyPresent:
        providerBody.length > 0,

      providerBodyLength:
        providerBody.length,

      providerContentTypeJson:
        contentType
          .toLowerCase()
          .includes(
            "application/json"
          ),

      providerUnauthorized:
        providerResponse.status === 401,

      providerForbidden:
        providerResponse.status === 403,

      providerNotFound:
        providerResponse.status === 404,
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