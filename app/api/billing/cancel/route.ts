import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasPermission } from "@/lib/rbac";

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

  // Important:
  // The outbound PayFast cancellation request is deliberately
  // not enabled in this local-only implementation stage.
  // This endpoint will only be activated after sandbox verification
  // of the exact PayFast REST signature/header contract.

  return NextResponse.json(
    {
      ready: true,
      subscriptionIdPresent: true,
      nextBillingDate:
        organization.next_billing_date,
      outboundCancellationEnabled: false,
    },
    { status: 200 }
  );
}