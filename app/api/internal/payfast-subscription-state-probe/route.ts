import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  buildPayFastApiHeaders,
  formatPayFastApiTimestamp,
} from "@/lib/payfast/api";

import { getPayFastMode } from "@/lib/payfast/mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization =
    request.headers.get("authorization");

  const accessToken =
    authorization
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (!accessToken) {
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
        error: "Server configuration unavailable",
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
  } = await supabase.auth.getUser(accessToken);

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
  } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile?.organization_id
  ) {
    return NextResponse.json(
      {
        error: "Profile unavailable",
        providerRequestSent: false,
      },
      { status: 403 }
    );
  }

  const allowed =
    ["owner", "admin", "manager"].includes(
      String(profile.role).toLowerCase()
    );

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Forbidden",
        providerRequestSent: false,
      },
      { status: 403 }
    );
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(
      "payfast_subscription_id, subscription_status, plan, next_billing_date"
    )
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return NextResponse.json(
      {
        error: "Organization unavailable",
        providerRequestSent: false,
      },
      { status: 404 }
    );
  }

  const subscriptionId =
    String(
      organization.payfast_subscription_id ?? ""
    ).trim();

  if (!subscriptionId) {
    return NextResponse.json(
      {
        error: "PayFast subscription unavailable",
        providerRequestSent: false,
      },
      { status: 409 }
    );
  }

  if (getPayFastMode() !== "sandbox") {
    return NextResponse.json(
      {
        error: "Sandbox only",
        providerRequestSent: false,
      },
      { status: 409 }
    );
  }

  const merchantId =
    process.env.PAYFAST_MERCHANT_ID?.trim();

  const passphrase =
    process.env.PAYFAST_PASSPHRASE?.trim();

  if (!merchantId || !passphrase) {
    return NextResponse.json(
      {
        error: "PayFast credentials unavailable",
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

  const providerResponse =
    await fetch(
      `https://api.payfast.co.za/subscriptions/${encodeURIComponent(
        subscriptionId
      )}/fetch?testing=true`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

  const providerBody =
    await providerResponse.text();

  let parsed: unknown = null;

  try {
    parsed =
      providerBody.length > 0
        ? JSON.parse(providerBody)
        : null;
  } catch {
    parsed = null;
  }

  const parsedObject =
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const providerTopLevelKeys =
    parsedObject
      ? Object.keys(parsedObject).sort()
      : [];

  const nestedKeyInventory =
    parsedObject
      ? Object.fromEntries(
          Object.entries(parsedObject)
            .filter(
              ([, value]) =>
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
            )
            .map(
              ([key, value]) => [
                key,
                Object.keys(
                  value as Record<string, unknown>
                ).sort(),
              ]
            )
        )
      : {};

  const safeData =
    parsedObject
      ? {
          status:
            "status" in parsedObject
              ? parsedObject.status
              : undefined,

          state:
            "state" in parsedObject
              ? parsedObject.state
              : undefined,

          subscription_status:
            "subscription_status" in parsedObject
              ? parsedObject.subscription_status
              : undefined,

          frequency:
            "frequency" in parsedObject
              ? parsedObject.frequency
              : undefined,

          cycles:
            "cycles" in parsedObject
              ? parsedObject.cycles
              : undefined,

          cycles_complete:
            "cycles_complete" in parsedObject
              ? parsedObject.cycles_complete
              : undefined,

          run_date:
            "run_date" in parsedObject
              ? parsedObject.run_date
              : undefined,
        }
      : null;

  return NextResponse.json(
    {
      probe:
        "payfast-subscription-state",

      readOnly:
        true,

      secretsReturned:
        false,

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

      providerTopLevelKeys,

      providerNestedKeyInventory:
        nestedKeyInventory,

      localSubscriptionStatus:
        organization.subscription_status,

      localPlan:
        organization.plan,

      localNextBillingDate:
        organization.next_billing_date,

      providerData:
        safeData,
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
