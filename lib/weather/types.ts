export type WeatherRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type WeatherSnapshot = {
  latitude: number;
  longitude: number;
  observedAt: string;

  temperatureC: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  visibilityKm: number | null;

  weatherCode: number | null;

  riskScore: number;
  riskLevel: WeatherRiskLevel;
  riskReasons: string[];
};

export type WeatherProviderResult = {
  provider: string;
  weather: WeatherSnapshot;
};
