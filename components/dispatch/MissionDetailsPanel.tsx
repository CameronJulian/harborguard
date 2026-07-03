"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type Props = {
  missionId: string | null;
};

export default function MissionDetailsPanel({
  missionId,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [mission, setMission] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);

  useEffect(() => {
    if (!missionId) return;

    async function load() {
      setLoading(true);

      try {
        const [missionRes, timelineRes, evidenceRes] =
          await Promise.all([
            fetchWithAuth(`/api/dispatch/missions/${missionId}`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/timeline`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/evidence`)
          ]);

        const missionJson = await missionRes.json();
        const timelineJson = await timelineRes.json();
        const evidenceJson = await evidenceRes.json();

        setMission(missionJson.mission);
        setTimeline(timelineJson.timeline || []);
        setEvidence(evidenceJson.evidence || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [missionId]);

  if (!missionId) {
    return (
      <div style={{ padding:24 }}>
        Select a mission.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding:24 }}>
        Loading mission...
      </div>
    );
  }

  return (
    <div
      style={{
        padding:24,
        border:"1px solid #e5e7eb",
        borderRadius:16,
        background:"#fff"
      }}
    >
      <h2>Mission Details</h2>

      <div>
        <strong>Status:</strong>{" "}
        {mission?.status}
      </div>

      <div>
        <strong>Timeline Events:</strong>{" "}
        {timeline.length}
      </div>

      <div>
        <strong>Evidence:</strong>{" "}
        {evidence.length}
      </div>
    </div>
  );
}

