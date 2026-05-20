import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { requirePremiumAccess } from "@/lib/require-premium";
type ReplayPoint = {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  speed_kmh: number | string | null;
  heading: number | string | null;
  recorded_at: string;
  source: string | null;
};

type CleanReplayPoint = ReplayPoint & {
  latitude: number;
  longitude: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return NaN;
}

function cleanPoint(
  point: ReplayPoint
): CleanReplayPoint | null {
  const lat = toNumber(point.latitude);
  const lng = toNumber(point.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return null;

  if (
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    return null;

  if (lat === 0 && lng === 0) return null;

  return {
    ...point,
    latitude: lat,
    longitude: lng,
  };
}

function reducePoints<T>(
  points: T[],
  maxPoints = 50
): T[] {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);

  const reduced = points.filter(
    (_, index) => index % step === 0
  );

  const last = points[points.length - 1];

  if (
    last &&
    reduced[reduced.length - 1] !== last
  ) {
    reduced.push(last);
  }

  return reduced;
}

async function snapReplayToRoads(
  points: CleanReplayPoint[]
): Promise<CleanReplayPoint[]> {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey || points.length < 2) {
    return points;
  }

  const cleanPoints = points
    .map(cleanPoint)
    .filter(
      (p): p is CleanReplayPoint =>
        p !== null
    );

  if (cleanPoints.length < 2) {
    return points;
  }

  const reducedPoints = reducePoints(
    cleanPoints,
    50
  );

  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: reducedPoints.map(
            (p) => [p.longitude, p.latitude]
          ),
          instructions: false,
          preference: "recommended",
        }),
      }
    );

    if (!response.ok) {
      return points;
    }

    const result = await response.json();

    const coords =
      result?.features?.[0]?.geometry
        ?.coordinates;

    if (
      !Array.isArray(coords) ||
      coords.length < 2
    ) {
      return points;
    }

    return coords
      .map(
        (
          coord: unknown,
          index: number
        ): CleanReplayPoint | null => {
          if (
            !Array.isArray(coord) ||
            coord.length < 2
          )
            return null;

          const lng = toNumber(coord[0]);
          const lat = toNumber(coord[1]);

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          )
            return null;

          const nearestOriginal =
            reducedPoints[
              Math.min(
                index,
                reducedPoints.length - 1
              )
            ] ??
            cleanPoints[
              cleanPoints.length - 1
            ];

          return {
            ...nearestOriginal,
            id: `snapped-${index}`,
            latitude: lat,
            longitude: lng,
            source: "map_matched",
          };
        }
      )
      .filter(
        (p): p is CleanReplayPoint =>
          p !== null
      );
  } catch {
    return points;
  }
}

export async function GET(req: Request) {
  try {
    const {
      supabase,
      organizationId,
    } = await requireOrganization();
	const premium = await requirePremiumAccess(organizationId);

if (!premium.allowed) {
  return NextResponse.json(
    { error: "Professional subscription required for route replay." },
    { status: 403 }
  );
}

    const url = new URL(req.url);

    const vehicleId =
      url.searchParams.get("vehicleId");

    const start =
      url.searchParams.get("start");

    const end =
      url.searchParams.get("end");

    if (!vehicleId) {
      return NextResponse.json(
        {
          error: "vehicleId is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: vehicle,
      error: vehicleError,
    } = await supabase
      .from("vehicles")
      .select(
        "id, nickname, registration_number, make, model"
      )
      .eq("id", vehicleId)
      .eq(
        "organization_id",
        organizationId
      )
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        {
          error:
            vehicleError?.message ||
            "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    let pointsQuery = supabase
      .from("vehicle_locations")
      .select(
        "id, vehicle_id, trip_id, latitude, longitude, speed_kmh, heading, recorded_at, source"
      )
      .eq("vehicle_id", vehicleId)
      .eq(
        "organization_id",
        organizationId
      )
      .order("recorded_at", {
        ascending: true,
      });

    let alertsQuery = supabase
      .from("vehicle_alerts")
      .select(
        "id, vehicle_id, trip_id, alert_type, severity, message, is_resolved, created_at, resolved_at, resolution_notes"
      )
      .eq("vehicle_id", vehicleId)
      .eq(
        "organization_id",
        organizationId
      )
      .order("created_at", {
        ascending: true,
      });

    if (start) {
      pointsQuery =
        pointsQuery.gte(
          "recorded_at",
          start
        );

      alertsQuery =
        alertsQuery.gte(
          "created_at",
          start
        );
    }

    if (end) {
      pointsQuery =
        pointsQuery.lte(
          "recorded_at",
          end
        );

      alertsQuery =
        alertsQuery.lte(
          "created_at",
          end
        );
    }

    const [
      {
        data: points,
        error: pointsError,
      },
      {
        data: alerts,
        error: alertsError,
      },
    ] = await Promise.all([
      pointsQuery,
      alertsQuery,
    ]);

    if (pointsError) {
      return NextResponse.json(
        { error: pointsError.message },
        { status: 500 }
      );
    }

    if (alertsError) {
      return NextResponse.json(
        { error: alertsError.message },
        { status: 500 }
      );
    }

    const rawPoints = (
      (points || []) as ReplayPoint[]
    )
      .map(cleanPoint)
      .filter(
        (p): p is CleanReplayPoint =>
          p !== null
      );

    const matchedPoints =
      await snapReplayToRoads(rawPoints);

    return NextResponse.json({
      success: true,
      vehicle,
      pointCount: matchedPoints.length,
      rawPointCount: rawPoints.length,
      alertCount: alerts?.length || 0,
      points: matchedPoints,
      rawPoints,
      alerts: alerts || [],
      mapMatched:
        matchedPoints.length !==
          rawPoints.length ||
        matchedPoints.some(
          (p) =>
            p.source === "map_matched"
        ),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load route replay.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}