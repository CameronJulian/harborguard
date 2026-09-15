import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function mapAcceptanceError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invitation expired")) {
    return {
      status: 410,
      error: "This invitation has expired.",
    };
  }

  if (normalized.includes("invitation already accepted")) {
    return {
      status: 409,
      error: "This invitation has already been accepted.",
    };
  }

  if (
    normalized.includes(
      "invitation email does not match authenticated user",
    )
  ) {
    return {
      status: 403,
      error: "This invitation belongs to a different account.",
    };
  }

  if (
    normalized.includes(
      "user already belongs to an organization",
    )
  ) {
    return {
      status: 409,
      error: "Your account already belongs to an organization.",
    };
  }

  if (normalized.includes("invitation not found")) {
    return {
      status: 404,
      error: "Invitation not found.",
    };
  }

  return {
    status: 400,
    error: "Unable to accept invitation.",
  };
}

export async function POST(request: Request) {
  const authHeader =
    request.headers.get("authorization") || "";

  const accessToken =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const invitationToken =
    body &&
    typeof body === "object" &&
    "token" in body &&
    typeof body.token === "string"
      ? body.token.trim()
      : "";

  if (!invitationToken) {
    return NextResponse.json(
      { error: "Invitation token is required." },
      { status: 400 },
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }

  const userClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 },
    );
  }

  const {
    data: organizationId,
    error: acceptanceError,
  } = await userClient.rpc(
    "accept_organization_invitation_atomic",
    {
      p_token: invitationToken,
    },
  );

  if (
    acceptanceError ||
    typeof organizationId !== "string" ||
    !organizationId
  ) {
    const mapped = mapAcceptanceError(
      acceptanceError?.message || "",
    );

    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }

  return NextResponse.json({
    success: true,
    organizationId,
  });
}
