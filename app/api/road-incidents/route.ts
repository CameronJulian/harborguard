import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") || "";

  const cookieToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sb-access-token="))
    ?.replace("sb-access-token=", "");

  return (
    authHeader?.replace("Bearer ", "") ||
    (cookieToken ? decodeURIComponent(cookieToken) : undefined)
  );
}

async function getOrganizationId(accessToken: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.organization_id) {
    throw new Error("Organization not found.");
  }

  return data.organization_id;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId(accessToken);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      incidents: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Failed to load road incidents.",
      },
      { status: 500 }
    );
  }
}