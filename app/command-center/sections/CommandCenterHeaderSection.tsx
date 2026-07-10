import type React from "react";

import CommandCenterVoiceSection from "./CommandCenterVoiceSection";
import CommandCenterStatusSection from "./CommandCenterStatusSection";
import CommandCenterSummaryCards from "./CommandCenterSummaryCards";
import CommandCenterToolbarSection from "./CommandCenterToolbarSection";

type Props = {
  voiceEnabled: boolean;
  voiceTranscript: string;
  copilotResponse: string;
  setVoiceEnabled: React.Dispatch<React.SetStateAction<boolean>>;

  operationalStatus: any;
  globalThreatScore: number;
  topThreatVehicles: any[];
  summary: any;

  buttonStyle: any;
  loadFleet: (...args: any[]) => any;
  runRiskDetection: (...args: any[]) => any;

  showRoutes: boolean;
  setShowRoutes: React.Dispatch<React.SetStateAction<boolean>>;
  showStops: boolean;
  setShowStops: React.Dispatch<React.SetStateAction<boolean>>;
  showHeatmap: boolean;
  setShowHeatmap: React.Dispatch<React.SetStateAction<boolean>>;
  followSelected: boolean;
  setFollowSelected: React.Dispatch<React.SetStateAction<boolean>>;

  message: string;
};

export default function CommandCenterHeaderSection({
  voiceEnabled,
  voiceTranscript,
  copilotResponse,
  setVoiceEnabled,
  operationalStatus,
  globalThreatScore,
  topThreatVehicles,
  summary,
  buttonStyle,
  loadFleet,
  runRiskDetection,
  showRoutes,
  setShowRoutes,
  showStops,
  setShowStops,
  showHeatmap,
  setShowHeatmap,
  followSelected,
  setFollowSelected,
  message,
}: Props) {
  return (
    <>
      <CommandCenterVoiceSection
        voiceEnabled={voiceEnabled}
        voiceTranscript={voiceTranscript}
        copilotResponse={copilotResponse}
        onToggleVoice={() => setVoiceEnabled((value) => !value)}
      />

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>
          Command Center
        </h1>

        <p style={{ color: "#64748b", margin: 0 }}>
          Live GPS command map with route trails, stop detection, risk alerts,
          replay, and emergency escalation.
        </p>
      </div>

      <CommandCenterStatusSection
        operationalStatus={operationalStatus}
        globalThreatScore={globalThreatScore}
        topThreatVehicles={topThreatVehicles}
      />

      <CommandCenterSummaryCards summary={summary} />

      <CommandCenterToolbarSection
        buttonStyle={buttonStyle}
        loadFleet={loadFleet}
        runRiskDetection={runRiskDetection}
        showRoutes={showRoutes}
        setShowRoutes={setShowRoutes}
        showStops={showStops}
        setShowStops={setShowStops}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        followSelected={followSelected}
        setFollowSelected={setFollowSelected}
        message={message}
      />
    </>
  );
}
