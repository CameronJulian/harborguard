export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cleanLatLng(
  latitude: unknown,
  longitude: unknown
): [number, number] | null {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (!lat || !lng) return null;
  return [lat, lng];
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function interpolatePosition(
  from: [number, number],
  to: [number, number],
  progress: number
): [number, number] {
  return [lerp(from[0], to[0], progress), lerp(from[1], to[1], progress)];
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusMeters = 6371e3;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLonRad = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function secondsSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Math.floor((Date.now() - time) / 1000);
}

export function alertLabel(value?: string | null) {
  return (value || "unknown_alert").replace(/_/g, " ").toUpperCase();
}

export function riskText(risk: string) {
  if (risk === "critical") return "Critical";
  if (risk === "high") return "High Risk";
  if (risk === "medium") return "Medium Risk";
  if (risk === "offline") return "Offline";
  return "Normal";
}

export function riskColor(risk: string) {
  if (risk === "critical") return "#dc2626";
  if (risk === "high") return "#f97316";
  if (risk === "medium") return "#f59e0b";
  if (risk === "offline") return "#64748b";
  return "#16a34a";
}

export function movementColor(status: string) {
  if (status === "Moving") return "#16a34a";
  if (status === "Stopped") return "#f59e0b";
  if (status === "Stale") return "#64748b";
  return "#94a3b8";
}