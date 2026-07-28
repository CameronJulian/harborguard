import { useState } from "react";

export function useCommandCenterViewState() {
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRoadRiskSegments, setShowRoadRiskSegments] = useState(true);
const [minimumRoadRisk, setMinimumRoadRisk] = useState(1);
  const [followSelected, setFollowSelected] = useState(true);
  const [search, setSearch] = useState("");

  return {
    showTrafficOverlay,
    setShowTrafficOverlay,
    selectedVehicleId,
    setSelectedVehicleId,
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
    search,
    setSearch,
  };
}
