import type {
  WeatherProviderResult,
  WeatherRiskLevel,
} from "../types";

const OPEN_METEO_BASE_URL =
  "https://api.open-meteo.com/v1/forecast";

const REQUEST_TIMEOUT_MS = 10000;

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  precipitation?: number;
  weather_code?: number;
  visibility?: number;
  wind_speed_10m?: number;
  wind_gusts_10m?: number;
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  current?: OpenMeteoCurrent;
  error?: boolean;
  reason?: string;
};

function validateCoordinates(
  latitude: number,
  longitude: number
) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      "Latitude must be a number between -90 and 90."
    );
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      "Longitude must be a number between -180 and 180."
    );
  }
}

function toNullableNumber(
  value: unknown
): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function calculateWeatherRisk(input: {
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  visibilityKm: number | null;
  weatherCode: number | null;
}): {
  riskScore: number;
  riskLevel: WeatherRiskLevel;
  riskReasons: string[];
} {
  let score = 0;
  const riskReasons: string[] = [];

  const windSpeed = input.windSpeedKph || 0;
  const windGust = input.windGustKph || 0;
  const precipitation = input.precipitationMm || 0;
  const visibility = input.visibilityKm;
  const weatherCode = input.weatherCode;

  if (windSpeed >= 60) {
    score += 40;
    riskReasons.push(
      `Severe sustained wind: ${Math.round(windSpeed)} km/h.`
    );
  } else if (windSpeed >= 40) {
    score += 25;
    riskReasons.push(
      `Strong sustained wind: ${Math.round(windSpeed)} km/h.`
    );
  } else if (windSpeed >= 25) {
    score += 10;
    riskReasons.push(
      `Moderate sustained wind: ${Math.round(windSpeed)} km/h.`
    );
  }

  if (windGust >= 80) {
    score += 40;
    riskReasons.push(
      `Dangerous wind gusts: ${Math.round(windGust)} km/h.`
    );
  } else if (windGust >= 60) {
    score += 25;
    riskReasons.push(
      `Strong wind gusts: ${Math.round(windGust)} km/h.`
    );
  } else if (windGust >= 40) {
    score += 10;
    riskReasons.push(
      `Elevated wind gusts: ${Math.round(windGust)} km/h.`
    );
  }

  if (precipitation >= 10) {
    score += 35;
    riskReasons.push(
      `Heavy precipitation: ${precipitation.toFixed(1)} mm.`
    );
  } else if (precipitation >= 4) {
    score += 20;
    riskReasons.push(
      `Moderate precipitation: ${precipitation.toFixed(1)} mm.`
    );
  } else if (precipitation > 0) {
    score += 5;
    riskReasons.push(
      `Light precipitation: ${precipitation.toFixed(1)} mm.`
    );
  }

  if (
    visibility !== null &&
    visibility < 1
  ) {
    score += 40;
    riskReasons.push(
      `Dangerously low visibility: ${visibility.toFixed(1)} km.`
    );
  } else if (
    visibility !== null &&
    visibility < 3
  ) {
    score += 25;
    riskReasons.push(
      `Low visibility: ${visibility.toFixed(1)} km.`
    );
  } else if (
    visibility !== null &&
    visibility < 8
  ) {
    score += 10;
    riskReasons.push(
      `Reduced visibility: ${visibility.toFixed(1)} km.`
    );
  }

  if (
    weatherCode !== null &&
    weatherCode >= 95
  ) {
    score += 35;
    riskReasons.push(
      "Thunderstorm conditions reported."
    );
  } else if (
    weatherCode !== null &&
    weatherCode >= 80
  ) {
    score += 15;
    riskReasons.push(
      "Heavy shower conditions reported."
    );
  } else if (
    weatherCode !== null &&
    weatherCode >= 71
  ) {
    score += 20;
    riskReasons.push(
      "Snow or freezing precipitation reported."
    );
  }

  const riskScore = Math.min(
    100,
    Math.max(0, score)
  );

  const riskLevel: WeatherRiskLevel =
    riskScore >= 70
      ? "critical"
      : riskScore >= 45
      ? "high"
      : riskScore >= 20
      ? "medium"
      : "low";

  if (riskReasons.length === 0) {
    riskReasons.push(
      "No significant weather hazards detected."
    );
  }

  return {
    riskScore,
    riskLevel,
    riskReasons,
  };
}

export async function loadOpenMeteoWeather(
  latitude: number,
  longitude: number
): Promise<WeatherProviderResult> {
  validateCoordinates(latitude, longitude);

  const url = new URL(
    OPEN_METEO_BASE_URL
  );

  url.searchParams.set(
    "latitude",
    String(latitude)
  );

  url.searchParams.set(
    "longitude",
    String(longitude)
  );

  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "precipitation",
      "weather_code",
      "visibility",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(",")
  );

  url.searchParams.set(
    "temperature_unit",
    "celsius"
  );

  url.searchParams.set(
    "wind_speed_unit",
    "kmh"
  );

  url.searchParams.set(
    "precipitation_unit",
    "mm"
  );

  url.searchParams.set(
    "timezone",
    "auto"
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      url.toString(),
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    const result =
      (await response.json()) as OpenMeteoResponse;

    if (!response.ok || result.error) {
      throw new Error(
        result.reason ||
          `Open-Meteo request failed with status ${response.status}.`
      );
    }

    if (!result.current) {
      throw new Error(
        "Open-Meteo returned no current weather data."
      );
    }

    const temperatureC =
      toNullableNumber(
        result.current.temperature_2m
      );

    const windSpeedKph =
      toNullableNumber(
        result.current.wind_speed_10m
      );

    const windGustKph =
      toNullableNumber(
        result.current.wind_gusts_10m
      );

    const precipitationMm =
      toNullableNumber(
        result.current.precipitation
      );

    const visibilityMeters =
      toNullableNumber(
        result.current.visibility
      );

    const visibilityKm =
      visibilityMeters === null
        ? null
        : Math.round(
            (visibilityMeters / 1000) *
              10
          ) / 10;

    const weatherCode =
      toNullableNumber(
        result.current.weather_code
      );

    const risk =
      calculateWeatherRisk({
        windSpeedKph,
        windGustKph,
        precipitationMm,
        visibilityKm,
        weatherCode,
      });

    return {
      provider: "openmeteo",
      weather: {
        latitude:
          toNullableNumber(
            result.latitude
          ) ?? latitude,

        longitude:
          toNullableNumber(
            result.longitude
          ) ?? longitude,

        observedAt:
          result.current.time ||
          new Date().toISOString(),

        temperatureC,
        windSpeedKph,
        windGustKph,
        precipitationMm,
        visibilityKm,
        weatherCode,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        riskReasons: risk.riskReasons,
      },
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Open-Meteo request timed out."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
