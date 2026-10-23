import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    await requirePlatformAdmin();

    return NextResponse.json(
      { authorized: true },
      { status: 200 }
    );
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
      { error: "Authentication check failed" },
      { status: 500 }
    );
  }
}