import type { FleetVehicle } from "./types";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function cleanRoute(route?: any[]) {
  return (route || [])
    .map((p) => {
      const lat = Array.isArray(p)
        ? toNumber(p[0])
        : toNumber(p?.latitude);

      const lng = Array.isArray(p)
        ? toNumber(p[1])
        : toNumber(p?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return null;

      if (lat < -90 || lat > 90)
        return null;

      if (lng < -180 || lng > 180)
        return null;

      if (lat === 0 && lng === 0)
        return null;

      return [lat, lng] as [number, number];
    })
    .filter((p): p is [number, number] => p !== null);
}

export function cleanLatLng(
  latitude: unknown,
  longitude: unknown
): [number, number] | null {

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return null;

  if (lat < -90 || lat > 90)
    return null;

  if (lng < -180 || lng > 180)
    return null;

  if (lat === 0 && lng === 0)
    return null;

  return [lat, lng];
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function calculateDistanceMeters(
  lat1:number,
  lon1:number,
  lat2:number,
  lon2:number
) {

  const R = 6371e3;

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;

  const Δφ = (lat2-lat1) * Math.PI / 180;
  const Δλ = (lon2-lon1) * Math.PI / 180;

  const a =
      Math.sin(Δφ/2) * Math.sin(Δφ/2)
    + Math.cos(φ1)
    * Math.cos(φ2)
    * Math.sin(Δλ/2)
    * Math.sin(Δλ/2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function secondsSince(value?: string | null) {
  if (!value) return 9999;

  const time = new Date(value).getTime();

  if (Number.isNaN(time))
    return 9999;

  return Math.max(
    0,
    Math.floor((Date.now() - time) / 1000)
  );
}

export function alertLabel(value?: string | null) {
  return (value || "unknown_alert")
    .replace(/_/g, " ")
    .toUpperCase();
}

export function vehicleRisk(vehicle: FleetVehicle) {

  const alerts = vehicle.openAlerts || [];

  if (alerts.some(a => a.severity==="critical"))
    return "critical";

  if (alerts.some(a => a.severity==="high"))
    return "high";

  if (alerts.length)
    return "alert";

  if (vehicle.isOffline)
    return "offline";

  return "normal";
}

export function riskText(risk:string){

  if(risk==="critical") return "Critical";
  if(risk==="high") return "High Risk";
  if(risk==="alert") return "Alert";
  if(risk==="offline") return "Offline";

  return "Normal";
}

export function riskColor(risk:string){

  if(risk==="critical") return "#dc2626";
  if(risk==="high") return "#ea580c";
  if(risk==="alert") return "#d97706";
  if(risk==="offline") return "#64748b";

  return "#16a34a";
}

export function movementStatus(vehicle:FleetVehicle){

  if(vehicle.isOffline)
    return "Offline";

  const age = secondsSince(vehicle.lastSeen);

  if(age>90)
    return "Stale";

  const speed = Number(vehicle.speedKmh || 0);

  if(speed<=2)
    return "Stopped";

  if(speed<=10)
    return "Slow";

  return "Moving";
}

export function movementColor(status:string){

  if(status==="Moving") return "#16a34a";
  if(status==="Slow") return "#d97706";
  if(status==="Stopped") return "#7c3aed";
  if(status==="Stale") return "#ea580c";

  return "#64748b";
}

export function replayHref(vehicle:FleetVehicle){

  const replayDate =
    vehicle.lastSeen
      ? new Date(vehicle.lastSeen)
      : new Date();

  const start = new Date(replayDate);
  start.setHours(0,0,0,0);

  const end = new Date(replayDate);
  end.setHours(23,59,59,999);

  return `/route-replay?vehicleId=${vehicle.id}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&autoplay=1`;
}
