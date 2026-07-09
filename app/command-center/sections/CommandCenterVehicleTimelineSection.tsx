import type { FleetVehicle, RoadIncident } from "../types";

type Props = {
  filteredFleet: FleetVehicle[];
  selectedVehicleId: string | null;
  incidents: RoadIncident[];
  cleanLatLng: (lat: unknown, lng: unknown) => [number, number] | null;
  calculateDistanceMeters: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => number;
  alertLabel: (type: string) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  formatDateTime: (value: string | null | undefined) => string;
};

export default function CommandCenterVehicleTimelineSection({
  filteredFleet,
  selectedVehicleId,
  incidents,
  cleanLatLng,
  calculateDistanceMeters,
  alertLabel,
  movementStatus,
  formatDateTime,
}: Props) {
  const timelineVehicle =
    filteredFleet.find((vehicle) => vehicle.id === selectedVehicleId) ||
    filteredFleet[0];

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 24, margin: "0 0 12px 0" }}>
        Vehicle Incident Timeline
      </h2>

      {!timelineVehicle ? (
        <div style={{ color: "#64748b" }}>
          Select a vehicle to view timeline.
        </div>
      ) : (
        (() => {
          const coords = cleanLatLng(
            timelineVehicle.latitude,
            timelineVehicle.longitude
          );

          const nearbyThreats = coords
            ? incidents.filter((incident) => {
                const distance = calculateDistanceMeters(
                  coords[0],
                  coords[1],
                  incident.latitude,
                  incident.longitude
                );

                return distance <= incident.radius_meters;
              })
            : [];

          const alertEvents = (timelineVehicle.openAlerts || []).map(
            (alert: any, index: number) => ({
              id: `alert-${alert.id || index}`,
              title: alert.message || alertLabel(alert.alert_type || "fleet_alert"),
              time: alert.created_at || timelineVehicle.lastSeen,
              type: "Alert",
            })
          );

          const threatEvents = nearbyThreats.map((incident: any, index: number) => ({
            id: `threat-${incident.id || index}`,
            title: `Entered threat zone: ${incident.title}`,
            time: incident.created_at || timelineVehicle.lastSeen,
            type: "Route Threat",
          }));

          const stopEvents = (timelineVehicle.stops || []).map(
            (stop: any, index: number) => ({
              id: `stop-${index}`,
              title: "Vehicle stopped",
              time:
                stop.arrivedAt ||
                stop.arrived_at ||
                stop.startedAt ||
                timelineVehicle.lastSeen,
              type: "Stop",
            })
          );

          const statusEvents = [
            {
              id: "status-current",
              title: `Current status: ${movementStatus(timelineVehicle)}`,
              time: timelineVehicle.lastSeen,
              type: "Status",
            },
          ];

          const events = [
            ...alertEvents,
            ...threatEvents,
            ...stopEvents,
            ...statusEvents,
          ]
            .filter((event) => event.time)
            .sort(
              (a, b) =>
                new Date(b.time).getTime() - new Date(a.time).getTime()
            )
            .slice(0, 8);

          return (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                {timelineVehicle.registrationNumber}{" "}
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  {timelineVehicle.nickname || ""}
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      borderLeft: "3px solid #2563eb",
                      paddingLeft: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{event.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      {event.type} - {formatDateTime(event.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
