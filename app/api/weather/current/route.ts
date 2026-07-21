import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireOrganization,
} from "@/lib/server-auth";

import {
  loadWeather,
} from "@/lib/weather/provider";

const DEFAULT_LATITUDE = -33.9249;
const DEFAULT_LONGITUDE = 18.4241;

function parseCoordinate(
  value: string | null,
  fallback: number
) {
  if (
    value === null ||
    value.trim() === ""
  ) {
    return fallback;
  }

  return Number(value);
}

export async function GET(
  request: NextRequest
) {
  try {
    await requireOrganization();

    const { searchParams } =
      new URL(request.url);

    const latitude = parseCoordinate(
      searchParams.get("latitude"),
      DEFAULT_LATITUDE
    );

    const longitude = parseCoordinate(
      searchParams.get("longitude"),
      DEFAULT_LONGITUDE
    );

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return NextResponse.json(
        {
          error:
            "latitude must be between -90 and 90.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error:
            "longitude must be between -180 and 180.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await loadWeather(
      latitude,
      longitude
    );

    return NextResponse.json({
      success: true,
      provider: result.provider,
      weather: result.weather,
      generatedAt:
        new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load current weather.";

    console.error(
      "[weather current GET]",
      message
    );

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 502,
      }
    );
  }
}