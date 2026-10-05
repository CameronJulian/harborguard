import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { routeSafetyReportRatelimit } from "@/lib/ratelimit";
import { getDistanceMeters } from "@/lib/geo/getDistanceMeters";

const DRIVER_REPORT_TYPES = new Set([
  "roadblock",
  "road_closure",
  "lane_closure",
  "roadworks",
  "congestion",
  "accident",
  "vehicle_breakdown",
  "flooding",
  "weather_hazard",
  "road_hazard",
  "debris",
  "police_activity",
  "protest",
  "traffic_light_outage",
  "smash_grab_hotspot",
]);

const DRIVER_REPORT_SEVERITIES =
  new Set([
    "low",
    "medium",
    "high",
    "critical",
  ]);

const DUPLICATE_PREFILTER_DEGREES = 0.01;
const DUPLICATE_DISTANCE_METERS = 500;
const DUPLICATE_WINDOW_HOURS = 2;

function normalizedReportType(
  value: unknown
): string | null {
  const raw =
    String(value || "")
      .trim()
      .toLowerCase();

  const aliases: Record<string, string> = {
    collision: "accident",
    crime: "smash_grab_hotspot",
    suspicious_activity: "road_hazard",
    other: "road_hazard",
  };

  const normalized =
    aliases[raw] || raw;

  return DRIVER_REPORT_TYPES.has(normalized)
    ? normalized
    : null;
}

export async function POST(
  req: NextRequest
) {
  try {
    const {
      supabase,
      organizationId,
      user,
    } =
      await requireOrganization();

    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    let rate;

    try {
      rate =
        await routeSafetyReportRatelimit.limit(
          `route-safety-report:${organizationId}:${user.id}:${ip}`
        );
    }
    catch {
      return NextResponse.json(
        {
          error:
            "Hazard reporting is temporarily unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    if (!rate.success) {
      return NextResponse.json(
        {
          error:
            "Too many hazard reports. Please wait before submitting another report.",
        },
        {
          status: 429,
        }
      );
    }

    const body =
      await req.json();

    const latitude =
      Number(body.latitude);

    const longitude =
      Number(body.longitude);

    if (
      !body.title ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        {
          error:
            "title, type, latitude and longitude are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid hazard coordinates.",
        },
        {
          status: 400,
        }
      );
    }

    const type =
      normalizedReportType(
        body.type
      );

    if (!type) {
      return NextResponse.json(
        {
          error:
            "Unsupported hazard type.",
        },
        {
          status: 400,
        }
      );
    }

    const severityCandidate =
      String(
        body.severity ||
        "medium"
      )
        .trim()
        .toLowerCase();

    const severity =
      DRIVER_REPORT_SEVERITIES.has(
        severityCandidate
      )
        ? severityCandidate
        : "medium";

    const radiusMeters =
      Math.min(
        2000,
        Math.max(
          50,
          Number(
            body.radius_meters ||
            500
          ) || 500
        )
      );

    const expiresHours =
      Math.min(
        24,
        Math.max(
          1,
          Number(
            body.expires_hours ||
            6
          ) || 6
        )
      );

    const expiresAt =
      new Date(
        Date.now() +
          expiresHours *
            60 *
            60 *
            1000
      ).toISOString();

    const duplicateCutoff =
      new Date(
        Date.now() -
          DUPLICATE_WINDOW_HOURS *
            60 *
            60 *
            1000
      ).toISOString();

    const minLatitude =
      latitude -
      DUPLICATE_PREFILTER_DEGREES;

    const maxLatitude =
      latitude +
      DUPLICATE_PREFILTER_DEGREES;

    const minLongitude =
      longitude -
      DUPLICATE_PREFILTER_DEGREES;

    const maxLongitude =
      longitude +
      DUPLICATE_PREFILTER_DEGREES;

    const {
      data: possibleDuplicates,
      error: duplicateError,
    } =
      await supabase
        .from("route_safety_alerts")
        .select(
          "id,type,title,latitude,longitude,created_at,verification_status"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "status",
          "active"
        )
        .eq(
          "type",
          type
        )
        .gte(
          "created_at",
          duplicateCutoff
        )
        .gte(
          "latitude",
          minLatitude
        )
        .lte(
          "latitude",
          maxLatitude
        )
        .gte(
          "longitude",
          minLongitude
        )
        .lte(
          "longitude",
          maxLongitude
        )
        .limit(25);

    if (duplicateError) {
      return NextResponse.json(
        {
          error:
            duplicateError.message,
        },
        {
          status: 500,
        }
      );
    }

    const duplicate =
      (possibleDuplicates || []).find(
        (candidate: any) => {
          const candidateLatitude =
            Number(candidate.latitude);

          const candidateLongitude =
            Number(candidate.longitude);

          if (
            !Number.isFinite(
              candidateLatitude
            ) ||
            !Number.isFinite(
              candidateLongitude
            )
          ) {
            return false;
          }

          return (
            getDistanceMeters(
              {
                latitude,
                longitude,
              },
              {
                latitude:
                  candidateLatitude,
                longitude:
                  candidateLongitude,
              }
            ) <=
            DUPLICATE_DISTANCE_METERS
          );
        }
      );

    if (duplicate) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        alert: duplicate,
        message:
          "A similar active hazard was recently reported nearby.",
      });
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "route_safety_alerts"
        )
        .insert({
          organization_id:
            organizationId,
          type,
          title:
            String(body.title)
              .trim()
              .slice(0, 160),
          description:
            body.description
              ? String(
                  body.description
                )
                  .trim()
                  .slice(
                    0,
                    1000
                  )
              : null,
          latitude,
          longitude,
          radius_meters:
            radiusMeters,
          severity,
          source:
            "operator",
          status:
            "active",
          created_by:
            user.id,
          verification_status:
            "unverified",
          verified_at:
            null,
          expires_at:
            expiresAt,
          suggested_route:
            null,
        })
        .select("*")
        .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      duplicate: false,
      alert: data,
    });
  }
  catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
}