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
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!missionId) return;

    async function load() {
      setLoading(true);

      try {
        const [missionRes, timelineRes, evidenceRes, notesRes] =
          await Promise.all([
            fetchWithAuth(`/api/dispatch/missions/${missionId}`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/timeline`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/evidence`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/notes`)
          ]);

        const missionJson = await missionRes.json();
        const timelineJson = await timelineRes.json();
        const evidenceJson = await evidenceRes.json();
        const notesJson = await notesRes.json();

        setMission(missionJson.mission);
        setTimeline(timelineJson.timeline || []);
        setEvidence(evidenceJson.evidence || []);
        setNotes(notesJson.notes || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [missionId]);

  async function saveNote() {
    if (!missionId || !noteText.trim()) return;

    setMessage("");

    const response = await fetchWithAuth(`/api/dispatch/missions/${missionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteText.trim() }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to save note.");
      return;
    }

    setNotes([result.note, ...notes]);
    setNoteText("");
  }

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

      <div style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Dispatcher Notes</h3>

        {message && (
          <div style={{ color: "#dc2626", marginBottom: 8 }}>
            {message}
          </div>
        )}

        <textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Add investigation note..."
          style={{
            width: "100%",
            minHeight: 90,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            marginBottom: 8
          }}
        />

        <button
          type="button"
          onClick={saveNote}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: 0,
            background: "#0f766e",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Save Note
        </button>

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {notes.length === 0 ? (
            <div style={{ color: "#64748b" }}>No notes yet.</div>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} style={{ padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                  {note.created_at ? new Date(note.created_at).toLocaleString() : "Just now"}
                </div>
                <div>{note.notes}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

