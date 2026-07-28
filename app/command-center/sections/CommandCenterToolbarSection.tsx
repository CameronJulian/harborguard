import type { CSSProperties, Dispatch, SetStateAction } from "react";

type Props = {
  buttonStyle: CSSProperties;
  loadFleet: () => void;
  runRiskDetection: () => void;
  showRoutes: boolean;
  setShowRoutes: Dispatch<SetStateAction<boolean>>;
  showStops: boolean;
  setShowStops: Dispatch<SetStateAction<boolean>>;
  showHeatmap: boolean;
  setShowHeatmap: Dispatch<SetStateAction<boolean>>;
  showRoadRiskSegments: boolean;
  setShowRoadRiskSegments: Dispatch<SetStateAction<boolean>>;
  minimumRoadRisk: number;
  setMinimumRoadRisk: Dispatch<SetStateAction<number>>;
  followSelected: boolean;
  setFollowSelected: Dispatch<SetStateAction<boolean>>;
  message: string;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function CommandCenterToolbarSection(props: Props) {
  const {
    buttonStyle,
    loadFleet,
    runRiskDetection,
    showRoutes,
    setShowRoutes,
    showStops,
    setShowStops,
    showHeatmap,
    setShowHeatmap,
    showRoadRiskSegments,
    setShowRoadRiskSegments,
    minimumRoadRisk,
    setMinimumRoadRisk,
    followSelected,
    setFollowSelected,
    message,
  } = props;

  return (
    <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={loadFleet} style={buttonStyle}>Refresh</button>

        <button onClick={runRiskDetection} style={{ ...buttonStyle, border: "none", background: "#2563eb", color: "#fff" }}>
          Run Risk Detection
        </button>

        <button onClick={() => setShowRoutes((v) => !v)} style={{ ...buttonStyle, background: showRoutes ? "#eff6ff" : "#fff", color: "#1d4ed8" }}>
          {showRoutes ? "Hide Routes" : "Show Routes"}
        </button>

        <button onClick={() => setShowStops((v) => !v)} style={{ ...buttonStyle, background: showStops ? "#faf5ff" : "#fff", color: "#7c3aed" }}>
          {showStops ? "Hide Stops" : "Show Stops"}
        </button>

        <button onClick={() => setShowHeatmap((v) => !v)} style={{ ...buttonStyle, background: showHeatmap ? "#fef3c7" : "#fff", color: "#d97706" }}>
          {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
        </button>

        <button
          onClick={() => setShowRoadRiskSegments((v) => !v)}
          style={{
            ...buttonStyle,
            background: showRoadRiskSegments ? "#fff7ed" : "#fff",
            color: "#c2410c",
          }}
        >
          {showRoadRiskSegments
            ? "Hide Road Risk"
            : "Show Road Risk"}
        </button>

        <select
          aria-label="Minimum road risk"
          value={minimumRoadRisk}
          disabled={!showRoadRiskSegments}
          onChange={(event) =>
            setMinimumRoadRisk(Number(event.target.value))
          }
          style={{
            ...buttonStyle,
            background: "#fff",
            color: "#334155",
            cursor: showRoadRiskSegments
              ? "pointer"
              : "not-allowed",
            opacity: showRoadRiskSegments ? 1 : 0.55,
          }}
        >
          <option value={1}>Risk 1+</option>
          <option value={10}>Risk 10+</option>
          <option value={20}>Risk 20+</option>
          <option value={40}>Risk 40+</option>
          <option value={60}>Risk 60+</option>
          <option value={80}>Risk 80+</option>
        </select>
        <button onClick={() => setFollowSelected((v) => !v)} style={{ ...buttonStyle, background: followSelected ? "#ecfdf5" : "#fff", color: "#16a34a" }}>
          {followSelected ? "Following Vehicle" : "Follow Vehicle"}
        </button>

        <div style={{ color: "#64748b", fontSize: 14 }}>
          Live refresh every 5 seconds.
        </div>
      </div>

      {message ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}