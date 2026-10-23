import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ORGANIZATION_FIELDS = [
  "id",
  "name",
  "created_at",
  "plan",
  "subscription_status",
  "trial_ends_at",
  "fleet_size",
  "seats",
].join(",");

export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select(ORGANIZATION_FIELDS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Platform organization listing failed:",
        error.code
      );

      return NextResponse.json(
        { error: "Failed to load organizations" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        organizations: data ?? [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load organizations" },
      { status: 500 }
    );
  }
}
type CreateOrganizationInput = {
  name: string;
  plan: "starter" | "professional" | "enterprise";
  fleet_size: number;
  seats: number;
  trial_days: number;
};

function parseOrganizationInput(value: unknown): CreateOrganizationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const allowedFields = new Set([
    "name",
    "plan",
    "fleet_size",
    "seats",
    "trial_days",
  ]);

  if (Object.keys(input).some((field) => !allowedFields.has(field))) {
    return null;
  }

  if (typeof input.name !== "string") {
    return null;
  }

  const name = input.name.trim();

  if (name.length < 2 || name.length > 150) {
    return null;
  }

  if (
    input.plan !== "starter" &&
    input.plan !== "professional" &&
    input.plan !== "enterprise"
  ) {
    return null;
  }

  if (
    typeof input.fleet_size !== "number" ||
    !Number.isInteger(input.fleet_size) ||
    input.fleet_size < 0 ||
    input.fleet_size > 100000
  ) {
    return null;
  }

  if (
    typeof input.seats !== "number" ||
    !Number.isInteger(input.seats) ||
    input.seats < 1 ||
    input.seats > 100000
  ) {
    return null;
  }

  if (
    typeof input.trial_days !== "number" ||
    !Number.isInteger(input.trial_days) ||
    input.trial_days < 1 ||
    input.trial_days > 90
  ) {
    return null;
  }

  return {
    name,
    plan: input.plan,
    fleet_size: input.fleet_size,
    seats: input.seats,
    trial_days: input.trial_days,
  };
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return NextResponse.json(
      { error: "Expected JSON request body" },
      { status: 415 }
    );
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const length = Number(contentLength);

    if (!Number.isSafeInteger(length) || length < 0 || length > 4096) {
      return NextResponse.json(
        { error: "Invalid request body size" },
        { status: 413 }
      );
    }
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (rawBody.length > 4096) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const input = parseOrganizationInput(parsedBody);

  if (!input) {
    return NextResponse.json(
      { error: "Invalid organization details" },
      { status: 400 }
    );
  }

  const trialEnd = new Date(
    Date.now() + input.trial_days * 24 * 60 * 60 * 1000
  );

  try {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: input.name,
        plan: input.plan,
        subscription_plan: input.plan,
        fleet_size: input.fleet_size,
        seats: input.seats,
        subscription_status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "Platform organization creation failed:",
        error?.code || "UNKNOWN"
      );

      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, organization_id: data.id },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
