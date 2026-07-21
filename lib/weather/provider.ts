import type { WeatherProviderResult } from "./types";

import {
  loadOpenMeteoWeather,
} from "./providers/openmeteo";

export async function loadWeather(
  latitude: number,
  longitude: number
): Promise<WeatherProviderResult> {

  const provider = String(
    process.env.WEATHER_PROVIDER ||
    "openmeteo"
  )
    .trim()
    .toLowerCase();

  switch (provider) {

    case "openmeteo":
      return loadOpenMeteoWeather(
        latitude,
        longitude
      );

    default:
      throw new Error(
        `Unsupported WEATHER_PROVIDER: ${provider}`
      );

  }

}
