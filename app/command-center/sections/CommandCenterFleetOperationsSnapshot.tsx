type WeatherRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

type WeatherRiskDistribution = Record<
  WeatherRiskLevel,
  number
>;

type FleetWeatherSummary = {
  averageRiskScore?: number;
  vehiclesWithLocation?: number;
  vehiclesWithWeatherData?: number;
  vehiclesAtElevatedRisk?: number;
  vehiclesAtSevereRisk?: number;
  riskDistribution?: Partial<WeatherRiskDistribution>;
};

type OperationsSummary = {
  activeVehicles?: number;
  activeTrips?: number;
  highRiskRoutes?: number;
  driversRerouted?: number;
  panicAlertsToday?: number;
  weather?: FleetWeatherSummary;
};

type Props = {
  operationsSummary: OperationsSummary | null;
};

const weatherRiskLabels: Record<
  WeatherRiskLevel,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const weatherRiskBackgrounds: Record<
  WeatherRiskLevel,
  string
> = {
  low: "#f0fdf4",
  medium: "#fffbeb",
  high: "#fff7ed",
  critical: "#fef2f2",
};

const weatherRiskBorders: Record<
  WeatherRiskLevel,
  string
> = {
  low: "#bbf7d0",
  medium: "#fde68a",
  high: "#fed7aa",
  critical: "#fecaca",
};

export default function CommandCenterFleetOperationsSnapshot({
  operationsSummary,
}: Props) {
  const weather = operationsSummary?.weather;

  const weatherDistribution: WeatherRiskDistribution = {
    low: weather?.riskDistribution?.low ?? 0,
    medium: weather?.riskDistribution?.medium ?? 0,
    high: weather?.riskDistribution?.high ?? 0,
    critical: weather?.riskDistribution?.critical ?? 0,
  };

  return (
    <div style={{ ...cardStyle, padding: 22, marginBottom: 24 }}>
      <h2 style={{ fontSize: 26, margin: "0 0 14px 0" }}>
        Fleet Operations Snapshot
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
        }}
      >
        {[
          [
            "Active Vehicles",
            operationsSummary?.activeVehicles ?? 0,
          ],
          [
            "Active Trips",
            operationsSummary?.activeTrips ?? 0,
          ],
          [
            "High-Risk Routes",
            operationsSummary?.highRiskRoutes ?? 0,
          ],
          [
            "Drivers Rerouted",
            operationsSummary?.driversRerouted ?? 0,
          ],
          [
            "Panic Alerts Today",
            operationsSummary?.panicAlertsToday ?? 0,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                marginTop: 6,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 19,
                margin: 0,
              }}
            >
              Fleet Weather Overview
            </h3>

            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Current weather exposure across vehicles with
              recent location data
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              minWidth: 150,
            }}
          >
            <div
              style={{
                color: "#1d4ed8",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Average risk score
            </div>

            <div
              style={{
                color: "#1e3a8a",
                fontSize: 26,
                fontWeight: 900,
                marginTop: 2,
              }}
            >
              {weather?.averageRiskScore ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
          }}
        >
          {(
            Object.keys(
              weatherRiskLabels
            ) as WeatherRiskLevel[]
          ).map((riskLevel) => (
            <div
              key={riskLevel}
              style={{
                padding: 14,
                borderRadius: 14,
                background:
                  weatherRiskBackgrounds[riskLevel],
                border: `1px solid ${weatherRiskBorders[riskLevel]}`,
              }}
            >
              <div
                style={{
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {weatherRiskLabels[riskLevel]} risk
              </div>

              <div
                style={{
                  fontSize: 25,
                  fontWeight: 900,
                  marginTop: 4,
                }}
              >
                {weatherDistribution[riskLevel]}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            color: "#475569",
            fontSize: 13,
            fontWeight: 700,
            marginTop: 14,
          }}
        >
          <span>
            Weather data:{" "}
            {weather?.vehiclesWithWeatherData ?? 0} vehicles
          </span>

          <span>
            Elevated risk:{" "}
            {weather?.vehiclesAtElevatedRisk ?? 0}
          </span>

          <span>
            Severe risk:{" "}
            {weather?.vehiclesAtSevereRisk ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
};