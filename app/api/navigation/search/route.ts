import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

type HereSearchItem = {
  id?: string;
  title?: string;
  address?: {
    label?: string;
  };
  position?: {
    lat?: number;
    lng?: number;
  };
  access?: Array<{
    lat?: number;
    lng?: number;
  }>;
  resultType?: string;
  categories?: Array<{
    id?: string;
    name?: string;
  }>;
};

type HereSearchResponse = {
  items?: HereSearchItem[];
};

export async function GET(req: NextRequest) {
  try {
    await requireOrganization();

    const query =
      req.nextUrl.searchParams
        .get("q")
        ?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    const apiKey =
      process.env.HERE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "HERE_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const requestedLat =
      Number(
        req.nextUrl.searchParams.get("lat")
      );

    const requestedLng =
      Number(
        req.nextUrl.searchParams.get("lng")
      );

    const hasValidPosition =
      Number.isFinite(requestedLat) &&
      Number.isFinite(requestedLng) &&
      requestedLat >= -90 &&
      requestedLat <= 90 &&
      requestedLng >= -180 &&
      requestedLng <= 180;

    const searchLat =
      hasValidPosition
        ? requestedLat
        : -33.9249;

    const searchLng =
      hasValidPosition
        ? requestedLng
        : 18.4241;

    const params =
      new URLSearchParams({
        q: query,
        at: `${searchLat},${searchLng}`,
        limit: "8",
        apiKey,
      });

    const url =
      "https://discover.search.hereapi.com/v1/discover" +
      `?${params.toString()}`;

    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "HERE destination search failed.",
          providerStatus:
            response.status,
        },
        {
          status: 502,
        }
      );
    }

    const data =
      (await response.json()) as HereSearchResponse;

    const items =
      Array.isArray(data.items)
        ? data.items
        : [];

    const results =
      items.flatMap((item) => {
        const lat =
          Number(item.position?.lat);

        const lng =
          Number(item.position?.lng);

        const firstAccess =
          Array.isArray(item.access)
            ? item.access[0]
            : undefined;

        const accessLat =
          Number(firstAccess?.lat);

        const accessLng =
          Number(firstAccess?.lng);

        const hasValidAccess =
          Number.isFinite(accessLat) &&
          Number.isFinite(accessLng) &&
          accessLat >= -90 &&
          accessLat <= 90 &&
          accessLng >= -180 &&
          accessLng <= 180;

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return [];
        }

        return [
          {
            id:
              item.id ?? null,
            title:
              item.title ??
              item.address?.label ??
              "Destination",
            address:
              item.address?.label ??
              null,
            lat,
            lng,
            accessLat:
              hasValidAccess
                ? accessLat
                : null,
            accessLng:
              hasValidAccess
                ? accessLng
                : null,
            resultType:
              item.resultType ??
              null,
            categories:
              Array.isArray(item.categories)
                ? item.categories
                    .map(
                      (category) =>
                        category.name
                    )
                    .filter(
                      (
                        value
                      ): value is string =>
                        typeof value ===
                          "string" &&
                        value.length > 0
                    )
                : [],
          },
        ];
      });

    return NextResponse.json({
      success: true,
      provider: "here_discover_v1",
      biasedToCurrentPosition:
        hasValidPosition,
      results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}
