export type CommandCenterGeofence = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
};

export type FleetAlert = {
  id?: string;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  created_at?: string | null;
};

export type FleetStop = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
};

export type RoadIncident = {
  id: string;
  type: string;
  title: string;
  latitude: number;
  longitude: number;
  severity: string;
  radius_meters: number;
};

export type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName?: string | null;
  isOffline?: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
  speedKmh?: number | null;
  heading?: number | null;
  lastSeen?: string | null;
  openAlerts?: FleetAlert[];
  route?: any[];
  stops?: FleetStop[];
  activeTrip?: {
    id: string;
    status: string | null;
    expectedRoute?: {
      points?: {
        name?: string;
        latitude: number;
        longitude: number;
      }[];
    } | null;
    originPort?: string | null;
    destinationFishery?: string | null;
  } | null;

  weather?: {
    temperatureC?: number | null;
    apparentTemperatureC?: number | null;
    windSpeedKmh?: number | null;
    windGustKmh?: number | null;
    visibilityKm?: number | null;
    precipitationMm?: number | null;
    condition?: string | null;
    conditionCode?: number | null;
  } | null;

  weatherPenalty?: number;

  weatherStatus?:
    | "available"
    | "unavailable"
    | "skipped_offline";
};
