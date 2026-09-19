import {
  reserveTomTomProviderRequest,
} from "@/lib/tomtom/tomTomCostGuard";

import {
  buildTomTomRoutingProviderCacheKey,
  cacheTomTomRoutingProviderResponse,
  getCachedTomTomRoutingProviderResponse,
} from "@/lib/routing/tomTomRoutingProviderCache";

type RoutingPoint = {
  lat: number;
  lng: number;
};

type TomTomRoutingRequest = {
  origin: RoutingPoint;
  destination: RoutingPoint;
  routingProfile?: string | null;
};

type TextWithPhonetics = {
  text?: string;
  phonetic?: string;
  phoneticLanguageCode?: string;
};

type TomTomRoadIdentifier = {
  identifier?: TextWithPhonetics;
  source?: string;
  roadAttribute?: string;
};

type TomTomRoadShield = {
  roadNumber?: TextWithPhonetics;
  countrySubdivisionCodeIso?: string;
  countryCodeIso2?: string;
};

type TomTomRoadInformation = {
  properties?: string[];
  roadShields?: TomTomRoadShield[];
  roadNumbers?: TomTomRoadIdentifier[];
  roadNames?: TomTomRoadIdentifier[];
  countryCodeIso2?: string;
};

type TomTomSignpost = {
  exitName?: TextWithPhonetics;
  exitNumber?: TextWithPhonetics;
  towardName?: TextWithPhonetics;
};

type TomTomRoutePathPoint = {
  point?: {
    latitude?: number;
    longitude?: number;
  };
  distanceFromRouteStartInMeters?: number;
  travelTimeFromRouteStartInSeconds?: number;
};

type TomTomInstruction = {
  routeOffsetInMeters?: number;
  maneuverPoint?: {
    latitude?: number;
    longitude?: number;
  };
  routePath?: TomTomRoutePathPoint[];
  maneuver?: string;
  message?: string;
  previousRoadInformation?: TomTomRoadInformation;
  nextRoadInformation?: TomTomRoadInformation;
  signpost?: TomTomSignpost;
  drivingSide?: string;
  landmark?: string;
  changeOfAngleInDegrees?: number;
  roundaboutExitNumber?: number;
  maneuverView?: {
    onRouteAngle?: string;
    offRouteAngles?: string[];
  };
};

type TomTomSummary = {
  lengthInMeters?: number;
  travelDurationInSeconds?: number;
  trafficDelayDurationInSeconds?: number;
  trafficLengthInMeters?: number;
};

type TomTomGeoJsonLineString = {
  type?: string;
  coordinates?: Array<
    [number, number]
  >;
};

type TomTomLeg = {
  summary?: TomTomSummary;
  path?: TomTomGeoJsonLineString;
};

type TomTomRoute = {
  summary?: TomTomSummary;
  path?: TomTomGeoJsonLineString;
  legs?: TomTomLeg[];
  instructions?: TomTomInstruction[];
};

type TomTomRoutingResponse = {
  routes?: TomTomRoute[];
};

function numberOrZero(
  value: unknown,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function finiteNumberOrNull(
  value: unknown,
): number | null {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function textOrNull(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}

function secondsToDuration(
  value: number,
): string {
  const total =
    Math.max(
      0,
      Math.round(value),
    );

  const hours =
    Math.floor(total / 3600);

  const minutes =
    Math.floor(
      (total % 3600) / 60,
    );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function identifierText(
  value:
    | TomTomRoadIdentifier
    | undefined,
): string | null {
  return textOrNull(
    value?.identifier?.text,
  );
}

function roadLabelFrom(
  road:
    | TomTomRoadInformation
    | undefined,
): string | null {
  const name =
    Array.isArray(
      road?.roadNames,
    )
      ? road?.roadNames
          .map(identifierText)
          .find(Boolean) ?? null
      : null;

  if (name) {
    return name;
  }

  return Array.isArray(
    road?.roadNumbers,
  )
    ? road?.roadNumbers
        .map(identifierText)
        .find(Boolean) ?? null
    : null;
}

function normalizedRoadMetadata(
  road:
    | TomTomRoadInformation
    | undefined,
) {
  if (!road) {
    return null;
  }

  const name =
    Array.isArray(
      road.roadNames,
    )
      ? road.roadNames
          .map(identifierText)
          .find(Boolean) ?? null
      : null;

  const number =
    Array.isArray(
      road.roadNumbers,
    )
      ? road.roadNumbers
          .map(identifierText)
          .find(Boolean) ?? null
      : null;

  if (
    !name &&
    !number
  ) {
    return null;
  }

  return {
    name,
    number,
    toward: [] as string[],
  };
}

function normalizeRoutePoints(
  route: TomTomRoute,
): Array<{
  latitude: number;
  longitude: number;
}> {
  const routeCoordinates =
    Array.isArray(
      route.path?.coordinates,
    )
      ? route.path.coordinates
      : [];

  const coordinates =
    routeCoordinates.length > 0
      ? routeCoordinates
      : Array.isArray(route.legs)
        ? route.legs.flatMap(
            (leg) =>
              Array.isArray(
                leg.path?.coordinates,
              )
                ? leg.path.coordinates
                : [],
          )
        : [];

  return coordinates.flatMap(
    (coordinate) => {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2
      ) {
        return [];
      }

      const longitude =
        Number(coordinate[0]);

      const latitude =
        Number(coordinate[1]);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return [];
      }

      return [
        {
          latitude,
          longitude,
        },
      ];
    },
  );
}

type TomTomManeuverGuidance =
  | "keepLeft"
  | "keepRight"
  | "mergeLeftLane"
  | "mergeRightLane";

function normalizeTomTomManeuverGuidance(
  value: unknown,
): TomTomManeuverGuidance | null {
  const maneuver =
    typeof value === "string"
      ? value.trim()
      : "";

  switch (maneuver) {
    case "keepLeft":
    case "keepRight":
    case "mergeLeftLane":
    case "mergeRightLane":
      return maneuver;

    default:
      return null;
  }
}

function normalizeInstructions(
  route: TomTomRoute,
) {
  const instructions =
    Array.isArray(
      route.instructions,
    )
      ? route.instructions
      : [];

  return instructions.map(
    (
      instruction,
      instructionIndex,
    ) => {
      const nextRoadLabel =
        roadLabelFrom(
          instruction.nextRoadInformation,
        );

      const previousRoadLabel =
        roadLabelFrom(
          instruction.previousRoadInformation,
        );

      const towardLabel =
        textOrNull(
          instruction.signpost
            ?.towardName?.text,
        );

      const exitNumber =
        textOrNull(
          instruction.signpost
            ?.exitNumber?.text,
        );

      return {
        instructionIndex,
        text:
          textOrNull(
            instruction.message,
          ),
        voiceText:
          textOrNull(
            instruction.message,
          ),
        action:
          textOrNull(
            instruction.maneuver,
          ),
        maneuverGuidance:
          normalizeTomTomManeuverGuidance(
            instruction.maneuver,
          ),
        direction: null,
        length: 0,
        duration: 0,
        offset:
          numberOrZero(
            instruction.routeOffsetInMeters,
          ),
        routeOffsetMeters:
          numberOrZero(
            instruction.routeOffsetInMeters,
          ),
        roadLabel:
          nextRoadLabel ??
          previousRoadLabel,
        towardLabel,
        exitNumber,
      };
    },
  );
}

function normalizeTurnByTurnActions(
  route: TomTomRoute,
) {
  const instructions =
    Array.isArray(
      route.instructions,
    )
      ? route.instructions
      : [];

  return instructions.map(
    (
      instruction,
      actionIndex,
    ) => ({
      sectionIndex: 0,
      actionIndex,
      action:
        textOrNull(
          instruction.maneuver,
        ),
      maneuverGuidance:
        normalizeTomTomManeuverGuidance(
          instruction.maneuver,
        ),
      direction:
        textOrNull(
          instruction.maneuverView
            ?.onRouteAngle,
        ),
      severity: null,
      length: 0,
      duration: 0,
      offset:
        numberOrZero(
          instruction.routeOffsetInMeters,
        ),
      routeOffsetMeters:
        numberOrZero(
          instruction.routeOffsetInMeters,
        ),
      turnAngle:
        finiteNumberOrNull(
          instruction.changeOfAngleInDegrees,
        ),
      currentRoad:
        normalizedRoadMetadata(
          instruction.previousRoadInformation,
        ),
      nextRoad:
        normalizedRoadMetadata(
          instruction.nextRoadInformation,
        ),
      signpost:
        instruction.signpost
          ? [
              {
                routeNumber:
                  textOrNull(
                    instruction.signpost
                      .exitNumber?.text,
                  ),
                name:
                  textOrNull(
                    instruction.signpost
                      .towardName?.text,
                  ),
              },
            ].filter(
              (value) =>
                Boolean(
                  value.routeNumber ||
                  value.name,
                ),
            )
          : [],
      exitNumbers:
        textOrNull(
          instruction.signpost
            ?.exitNumber?.text,
        )
          ? [
              textOrNull(
                instruction.signpost
                  ?.exitNumber?.text,
              ) as string,
            ]
          : [],
      drivingSide:
        textOrNull(
          instruction.drivingSide,
        ),
      landmark:
        textOrNull(
          instruction.landmark,
        ),
      maneuverView:
        instruction.maneuverView ??
        null,
      roundaboutExitNumber:
        finiteNumberOrNull(
          instruction.roundaboutExitNumber,
        ),
    }),
  );
}

export function normalizeTomTomResponse(
  data: TomTomRoutingResponse,
  routingProfile: string,
) {
  const rawRoutes =
    Array.isArray(data.routes)
      ? data.routes
      : [];

  const routes =
    rawRoutes.map(
      (route, index) => {
        const summary =
          route.summary ?? {};

        const distanceMeters =
          numberOrZero(
            summary.lengthInMeters,
          );

        const durationSeconds =
          numberOrZero(
            summary.travelDurationInSeconds,
          );

        const trafficDelaySeconds =
          numberOrZero(
            summary.trafficDelayDurationInSeconds,
          );

        const baseDurationSeconds =
          Math.max(
            0,
            durationSeconds -
              trafficDelaySeconds,
          );

        const routePoints =
          normalizeRoutePoints(
            route,
          );

        const navigationInstructions =
          normalizeInstructions(
            route,
          );

        const navigationTurnByTurnActions =
          normalizeTurnByTurnActions(
            route,
          );

        return {
          index,
          label:
            index === 0
              ? "Current best TomTom route"
              : `TomTom alternative route ${index}`,
          provider:
            "tomtom_orbis_routing_v3",
          distanceMeters,
          duration:
            secondsToDuration(
              durationSeconds,
            ),
          staticDuration:
            secondsToDuration(
              baseDurationSeconds,
            ),
          durationSeconds,
          baseDurationSeconds,
          trafficDelaySeconds,
          description:
            "TomTom Orbis Routing v3 traffic-aware route",
          encodedPolyline: null,
          encodedPolylines:
            [] as string[],
          routePoints,
          routePointCount:
            routePoints.length,
          navigationActions:
            [] as unknown[],
          navigationTurnByTurnActions,
          navigationInstructions,
          speedLimitSegments:
            [] as unknown[],
          sections:
            Array.isArray(route.legs)
              ? route.legs.length
              : 0,
        };
      },
    );

  const recommendedRoute =
    routes[0] ?? null;

  return {
    provider:
      "tomtom_orbis_routing_v3",
    routingProfile,
    routes,
    recommendedRoute,
    recommendation:
      recommendedRoute
        ? "TomTom primary route"
        : "No TomTom route available",
  };
}

export async function calculateTomTomRoutes(
  request: TomTomRoutingRequest,
) {
  const apiKey =
    process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TOMTOM_API_KEY is not configured.",
    );
  }

  const routingProfile =
    String(
      request.routingProfile ??
        "fast",
    )
      .trim()
      .toLowerCase() ||
    "fast";

  const cacheKey =
    buildTomTomRoutingProviderCacheKey(
      {
        origin: {
          latitude:
            request.origin.lat,
          longitude:
            request.origin.lng,
        },
        destination: {
          latitude:
            request.destination.lat,
          longitude:
            request.destination.lng,
        },
        routingProfile,
      },
    );

  let data =
    (await getCachedTomTomRoutingProviderResponse(
      cacheKey,
    )) as
      | TomTomRoutingResponse
      | null;

  if (!data) {
    const reservation =
      await reserveTomTomProviderRequest(
        "routing",
      );

    if (!reservation.allowed) {
      throw new Error(
        `TomTom Routing blocked by cost guard: ${reservation.reason}.`,
      );
    }

    const url =
      "https://api.tomtom.com/maps/orbis/routing/routes/calculate";

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "TomTom-Api-Version":
              "3",
            "TomTom-Api-Key":
              apiKey,
            Attributes:
              "routes",
            "Accept-Language":
              "en-GB",
          },
          body:
            JSON.stringify({
              routePlanningLocations: {
                origin: {
                  type: "Point",
                  coordinates: [
                    request.origin.lng,
                    request.origin.lat,
                  ],
                },
                destination: {
                  type: "Point",
                  coordinates: [
                    request.destination.lng,
                    request.destination.lat,
                  ],
                },
              },
              travelMode:
                "car",
              traffic:
                "live",
              routeType:
                routingProfile ===
                "shortest"
                  ? "short"
                  : "fast",
              guidance:
                "instructions",
              instructionPhonetics:
                "ipa",
            }),
          cache:
            "no-store",
        },
      );

    if (!response.ok) {
      const detail =
        await response.text();

      throw new Error(
        `TomTom Routing failed (${response.status}): ${detail.slice(0, 300)}`,
      );
    }

    data =
      (await response.json()) as
        TomTomRoutingResponse;

    await cacheTomTomRoutingProviderResponse(
      cacheKey,
      data,
    );
  }

  return normalizeTomTomResponse(
    data,
    routingProfile,
  );
}
