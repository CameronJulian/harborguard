import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasPermission } from "@/lib/rbac";
import {
  buildPayFastApiHeaders,
  formatPayFastApiTimestamp,
} from "@/lib/payfast/api";
import {
  getPayFastApiSubscriptionCancelUrl,
  getPayFastMode,
} from "@/lib/payfast/mode";

export async function POST(request: Request) {
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

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: userData,
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await userClient
    .from("profiles")
    .select("organization_id, role")
    .eq("id", userData.user.id)
    .single();

  if (
    profileError ||
    !profile?.organization_id
  ) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  if (
    !hasPermission(
      profile.role,
      "billing:manage"
    )
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: organization,
    error: organizationError,
  } = await serviceClient
    .from("organizations")
    .select(
      "id, payfast_subscription_id, subscription_status, next_billing_date"
    )
    .eq(
      "id",
      profile.organization_id
    )
    .single();

  if (
    organizationError ||
    !organization
  ) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  if (
    !organization.payfast_subscription_id
  ) {
    return NextResponse.json(
      {
        error:
          "No PayFast subscription is associated with this organization.",
      },
      { status: 409 }
    );
  }

  const payfastMode =
    getPayFastMode();

  /*
   * Safety boundary:
   * HarborGuard may exercise outbound subscription cancellation
   * only while PAYFAST_SANDBOX=true.
   *
   * Production cancellation remains deliberately disabled until
   * the sandbox request/response lifecycle has been validated.
   */
  if (payfastMode !== "sandbox") {
    return NextResponse.json(
      {
        ready: true,
        subscriptionIdPresent: true,
        nextBillingDate:
          organization.next_billing_date,
        outboundCancellationEnabled: false,
        sandboxOnly: true,
      },
      { status: 200 }
    );
  }

  const merchantId =
    process.env.PAYFAST_MERCHANT_ID?.trim();

  const passphrase =
    process.env.PAYFAST_PASSPHRASE?.trim();

  if (!merchantId || !passphrase) {
    return NextResponse.json(
      {
        error:
          "PayFast sandbox cancellation credentials are not configured.",
      },
      { status: 503 }
    );
  }

  const timestamp =
    formatPayFastApiTimestamp();

  const payfastUrl =
    getPayFastApiSubscriptionCancelUrl(
      organization.payfast_subscription_id
    );

  const payfastHeaders =
    buildPayFastApiHeaders({
      merchantId,
      passphrase,
      timestamp,
    });

  /*
   * Sandbox-only outbound request.
   *
   * The response is intentionally not used to mutate HarborGuard
   * subscription state here. Cancellation state continues to be
   * driven by the existing verified PayFast cancellation lifecycle.
   */
  const payfastResponse =
    await fetch(
      payfastUrl,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          ...payfastHeaders,
        },
        cache: "no-store",
      }
    );

  const responseText =
    await payfastResponse.text();

  if (!payfastResponse.ok) {
    console.error(
      "PayFast sandbox cancellation request failed",
      {
        status: payfastResponse.status,
      }
    );

    return NextResponse.json(
      {
        error:
          "PayFast sandbox cancellation request failed.",
        providerStatus:
          payfastResponse.status,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ready: true,
      subscriptionIdPresent: true,
      nextBillingDate:
        organization.next_billing_date,
      outboundCancellationEnabled: true,
      sandboxOnly: true,
      providerStatus:
        payfastResponse.status,
      providerResponseReceived:
        responseText.length >= 0,
    },
    { status: 200 }
  );
}
