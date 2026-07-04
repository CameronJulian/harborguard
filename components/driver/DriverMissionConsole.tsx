"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { subscribeCommandCenterRealtime } from "@/lib/realtime/commandCenterEvents";
import { subscribeMissionMessages } from "@/lib/realtime/missionMessages";

function nextStatus(status: string) {
  const map: Record<string, string> = {
    Assigned: "Accepted",
    Accepted: "En Route",
    "En Route": "Arrived",
    Arrived: "In Progress",
    "In Progress": "Completed",
  };

  return map[status] || null;
}

function actionLabel(status: string) {
  const map: Record<string, string> = {
    Assigned: "Accept Mission",
    Accepted: "Start Journey",
    "En Route": "Mark Arrived",
    Arrived: "Start Work",
    "In Progress": "Complete Mission",
  };

  return map[status] || "Update Mission";
}

export default function DriverMissionConsole({ vehicleId }: { vehicleId: string }) {
  const [mission, setMission] = useState<any | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");

  async function loadMission() {
    if (!vehicleId) {
      setMission(null);
      setMissions([]);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetchWithAuth(`/api/mobile/missions?vehicleId=${vehicleId}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load mission.");
        return;
      }

      const currentMission = result.currentMission || null;

      setMission(currentMission);
      setMissions(result.missions || []);

      if (currentMission?.id) {
        await loadTimeline(currentMission.id);
        await loadChatMessages(currentMission.id);
      } else {
        setTimeline([]);
        setChatMessages([]);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load mission.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline(missionId: string) {
    const response = await fetchWithAuth(`/api/dispatch/missions/${missionId}/timeline`, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load timeline.");
    }

    setTimeline(result.timeline || []);
  }

  async function loadChatMessages(missionId: string) {
    const response = await fetchWithAuth(`/api/dispatch/missions/${missionId}/messages`, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load mission chat.");
    }

    setChatMessages(result.messages || []);
  }

  async function sendDriverMessage() {
    if (!mission?.id || !chatText.trim()) return;

    const response = await fetchWithAuth(`/api/dispatch/missions/${mission.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: chatText.trim(),
        senderRole: "driver",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to send message.");
      return;
    }

    setChatMessages((current) => [...current, result.message]);
    setChatText("");
  }

  async function updateMission(status: string) {
    if (!mission?.id) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetchWithAuth(`/api/dispatch/missions/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to update mission.");
        return;
      }

      setMessage(`Mission updated to ${status}.`);
      await loadMission();
    } catch (error: any) {
      setMessage(error.message || "Failed to update mission.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoSelection(event: any) {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoDataUrl(null);
      setPhotoName("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoDataUrl(String(reader.result || ""));
      setPhotoName(file.name);
    };

    reader.readAsDataURL(file);
  }

  async function saveEvidence(evidenceType: string, payload: any) {
    if (!mission?.id) return;

    const response = await fetchWithAuth(`/api/dispatch/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceType,
        ...payload,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to save mission evidence.");
    }

    return result.evidence;
  }

  async function completeMissionWithEvidence() {
    if (!mission?.id) return;

    try {
      setLoading(true);
      setMessage("");

      const hasPhoto = !!photoDataUrl;
      const hasSignature = signatureName.trim().length > 0;
      const hasNotes = evidenceNotes.trim().length > 0;

      if (!hasPhoto && !hasSignature && !hasNotes) {
        throw new Error("Proof of delivery requires at least a photo, signature, or delivery note.");
      }

      if (evidenceNotes.trim()) {
        await saveEvidence("note", {
          notes: evidenceNotes.trim(),
          metadata: {
            source: "driver_mission_console",
          },
        });
      }

      if (signatureName.trim()) {
        await saveEvidence("signature", {
          signatureData: signatureName.trim(),
          notes: "Customer signature/name captured by driver.",
          metadata: {
            source: "driver_mission_console",
            signatureType: "typed_name",
          },
        });
      }

      if (photoDataUrl) {
        await saveEvidence("photo", {
          fileUrl: photoDataUrl,
          filePath: photoName || null,
          notes: "Mission completion photo captured by driver.",
          metadata: {
            source: "driver_mission_console",
            fileName: photoName || null,
          },
        });
      }

      await updateMission("Completed");

      setEvidenceNotes("");
      setSignatureName("");
      setPhotoDataUrl(null);
      setPhotoName("");
    } catch (error: any) {
      setMessage(error.message || "Failed to complete mission with evidence.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMissionLocation(position: GeolocationPosition) {
    if (!mission?.id) return;

    try {
      await fetchWithAuth(`/api/dispatch/missions/${mission.id}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          accuracy: position.coords.accuracy,
          isMoving: position.coords.speed ? position.coords.speed > 0.5 : null,
          metadata: {
            source: "driver_mission_console",
          },
        }),
      });

      setTrackingStatus("Live GPS tracking active.");
    } catch {
      setTrackingStatus("GPS update failed.");
    }
  }

  useEffect(() => {
    loadMission();

    const unsubscribe = subscribeCommandCenterRealtime(loadMission);

    let unsubscribeMessages: (() => void) | null = null;
    let geoWatchId: number | null = null;

    if (mission?.id) {
      unsubscribeMessages = subscribeMissionMessages(
        mission.id,
        (payload) => {
          setChatMessages((current) => {
            const exists = current.some((m: any) => m.id === payload.new.id);
            if (exists) return current;
            return [...current, payload.new];
          });
        }
      );
    }

    if (
      mission?.id &&
      !["Completed", "Cancelled"].includes(mission.status) &&
      "geolocation" in navigator
    ) {
      geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
          void sendMissionLocation(position);
        },
        () => {
          setTrackingStatus("GPS permission unavailable.");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );
    }

    return () => {
      unsubscribe();
      if (unsubscribeMessages) unsubscribeMessages();
      if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
    };
  }, [vehicleId, mission?.id, mission?.status]);

  const next = mission ? nextStatus(mission.status) : null;
  const route = mission?.route_data?.selectedRoute;

  return (
    <div style={{ background: "#ffffff", borderRadius: 20, border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ color: "#2563eb", fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            DRIVER MISSION CONSOLE
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Current Mission</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            Accept, start, arrive, and complete assigned dispatch missions.
          </div>
        </div>

        <button
          type="button"
          onClick={loadMission}
          disabled={loading}
          style={{ height: "fit-content", padding: "10px 14px", borderRadius: 12, border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && <div style={{ color: message.includes("updated") ? "#16a34a" : "#dc2626", marginBottom: 12, fontWeight: 700 }}>{message}</div>}

      {!vehicleId ? (
        <div style={{ color: "#64748b" }}>Select a vehicle to load driver missions.</div>
      ) : loading && !mission ? (
        <div style={{ color: "#64748b" }}>Loading driver mission...</div>
      ) : !mission ? (
        <div style={{ color: "#64748b" }}>No active mission assigned to this vehicle.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ padding: 16, borderRadius: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                  {mission.mission_type || "Dispatch Mission"}
                </div>
                <div style={{ color: "#475569", marginTop: 6 }}>
                  Priority: <strong>{String(mission.priority || "normal").toUpperCase()}</strong>
                </div>
                <div style={{ color: "#475569", marginTop: 4 }}>
                  Status: <strong>{mission.status}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right", color: "#1d4ed8", fontWeight: 900 }}>
                Mission #{String(mission.id).slice(0, 8)}
              </div>
            </div>

            <div style={{ marginTop: 14, color: "#334155" }}>
              Incident: {mission.incidents?.incident_code || "None linked"}
              {mission.incidents?.severity ? ` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${mission.incidents.severity}` : ""}
            </div>

            <div style={{ marginTop: 6, color: "#334155" }}>
              Destination: {mission.destination_lat}, {mission.destination_lng}
            </div>

            {trackingStatus && (
              <div style={{ marginTop: 6, color: "#2563eb", fontWeight: 800 }}>
                {trackingStatus}
              </div>
            )}

            {route && (
              <div style={{ marginTop: 6, color: "#334155" }}>
                Route: {route.label || "Selected route"} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {route.duration || "ETA unavailable"}
              </div>
            )}

            {mission.notes && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #dbeafe" }}>
                <strong>Notes:</strong> {mission.notes}
              </div>
            )}

            {!["Completed", "Cancelled"].includes(mission.status) && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "#ffffff", border: "1px solid #dbeafe" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Mission Evidence</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, color: "#334155", fontWeight: 700 }}>
                    Delivery photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelection}
                      disabled={loading}
                    />
                  </label>

                  {photoName && (
                    <div style={{ color: "#2563eb", fontSize: 13, fontWeight: 800 }}>
                      Photo selected: {photoName}
                    </div>
                  )}

                  <label style={{ display: "grid", gap: 6, color: "#334155", fontWeight: 700 }}>
                    Customer signature/name
                    <input
                      value={signatureName}
                      onChange={(event) => setSignatureName(event.target.value)}
                      placeholder="Customer name or signature confirmation"
                      disabled={loading}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, color: "#334155", fontWeight: 700 }}>
                    Completion notes
                    <textarea
                      value={evidenceNotes}
                      onChange={(event) => setEvidenceNotes(event.target.value)}
                      placeholder="Add delivery / completion notes"
                      disabled={loading}
                      rows={3}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", resize: "vertical" }}
                    />
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {next && (
                <button
                  type="button"
                  onClick={() => next === "Completed" ? completeMissionWithEvidence() : updateMission(next)}
                  disabled={loading}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#16a34a", color: "#ffffff", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {actionLabel(mission.status)}
                </button>
              )}

              {!["Completed", "Cancelled"].includes(mission.status) && (
                <button
                  type="button"
                  onClick={() => updateMission("Cancelled")}
                  disabled={loading}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  Unable To Complete
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", background: "#ffffff" }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
              Mission Timeline
            </div>

            {timeline.length === 0 ? (
              <div style={{ color: "#64748b" }}>No activity yet.</div>
            ) : (
              timeline.map((event: any) => (
                <div key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700 }}>{event.title}</div>

                  {event.detail && (
                    <div style={{ color: "#475569", marginTop: 4 }}>
                      {event.detail}
                    </div>
                  )}

                  <div style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {missions.length > 1 && (
            <div style={{ color: "#64748b", fontSize: 14 }}>
              {missions.length - 1} additional active mission(s) assigned to this vehicle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
