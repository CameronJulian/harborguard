"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { subscribeCommandCenterRealtime } from "@/lib/realtime/commandCenterEvents";
import { supabaseBrowser } from "@/lib/supabase/browser";

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
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!missionId) return;

    async function load() {
      setLoading(true);

      try {
        const [missionRes, timelineRes, evidenceRes, notesRes, messagesRes] =
          await Promise.all([
            fetchWithAuth(`/api/dispatch/missions/${missionId}`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/timeline`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/evidence`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/notes`),
            fetchWithAuth(`/api/dispatch/missions/${missionId}/messages`)
          ]);

        const missionJson = await missionRes.json();
        const timelineJson = await timelineRes.json();
        const evidenceJson = await evidenceRes.json();
        const notesJson = await notesRes.json();
        const messagesJson = await messagesRes.json();

        setMission(missionJson.mission);
        setTimeline(timelineJson.timeline || []);
        setEvidence(evidenceJson.evidence || []);
        setNotes(notesJson.notes || []);
        setMessages(messagesJson.messages || []);
      } finally {
        setLoading(false);
      }
    }

    load();

    const unsubscribe = subscribeCommandCenterRealtime(load);

    return () => unsubscribe();
  }, [missionId]);

  async function uploadEvidenceFile(file: File) {
    if (!missionId) return;

    setMessage("");
    setUploadingEvidence(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `missions/${missionId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseBrowser.storage
        .from("mission-evidence")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabaseBrowser.storage
        .from("mission-evidence")
        .getPublicUrl(filePath);

      const response = await fetchWithAuth(`/api/dispatch/missions/${missionId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceType: file.type.startsWith("image/") ? "photo" : "note",
          fileUrl: publicUrlData.publicUrl,
          filePath,
          notes: `File uploaded: ${file.name}`,
          metadata: {
            source: "mission_details_panel",
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save evidence record.");
      }

      setEvidence((current) => [result.evidence, ...current]);
    } catch (error: any) {
      setMessage(error.message || "Failed to upload evidence.");
    } finally {
      setUploadingEvidence(false);
    }
  }

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

  async function sendMessage() {
    if (!missionId || !messageText.trim()) return;

    const response = await fetchWithAuth(`/api/dispatch/missions/${missionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText.trim(),
        senderRole: "dispatcher",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to send message.");
      return;
    }

    setMessages((current) => [...current, result.message]);
    setMessageText("");
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

      <div style={{ marginTop: 20, padding: 14, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Mission Evidence</h3>

        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadEvidenceFile(file);
            event.currentTarget.value = "";
          }}
          disabled={uploadingEvidence}
        />

        <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
          {uploadingEvidence ? "Uploading evidence..." : "Upload photos, PDFs, screenshots, or mission documents."}
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {evidence.length === 0 ? (
            <div style={{ color: "#64748b" }}>No evidence uploaded yet.</div>
          ) : (
            evidence.map((item: any) => (
              <div key={item.id} style={{ padding: 10, borderRadius: 10, background: "#ffffff", border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 800 }}>
                  {item.evidence_type || "evidence"}
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {item.notes || item.file_path || "Mission evidence"}
                </div>
                {item.file_url && item.metadata?.fileType?.startsWith("image/") && (
                  <a href={item.file_url} target="_blank" rel="noreferrer">
                    <img
                      src={item.file_url}
                      alt={item.notes || "Mission evidence"}
                      style={{
                        width: "100%",
                        maxHeight: 220,
                        objectFit: "cover",
                        borderRadius: 10,
                        marginTop: 8,
                        border: "1px solid #e5e7eb"
                      }}
                    />
                  </a>
                )}

                {item.file_url && item.metadata?.fileType?.startsWith("video/") && (
                  <video controls style={{ width: "100%", borderRadius: 10, marginTop: 8 }}>
                    <source src={item.file_url} type={item.metadata.fileType} />
                  </video>
                )}

                {item.file_url && item.metadata?.fileType?.startsWith("audio/") && (
                  <audio controls src={item.file_url} style={{ width: "100%", marginTop: 8 }} />
                )}

                {item.file_url && item.metadata?.fileType === "application/pdf" && (
                  <a href={item.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#2563eb", fontWeight: 800, fontSize: 13 }}>
                    Open PDF
                  </a>
                )}

                {item.file_url &&
                  !item.metadata?.fileType?.startsWith("image/") &&
                  !item.metadata?.fileType?.startsWith("video/") &&
                  !item.metadata?.fileType?.startsWith("audio/") &&
                  item.metadata?.fileType !== "application/pdf" && (
                    <a href={item.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#2563eb", fontWeight: 800, fontSize: 13 }}>
                      Open Attachment
                    </a>
                  )}
              </div>
            ))
          )}
        </div>
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

      <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #e5e7eb" }}>
        <h3 style={{ marginBottom: 8 }}>Mission Chat</h3>

        <div style={{ display: "grid", gap: 10, maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
          {messages.length === 0 ? (
            <div style={{ color: "#64748b" }}>No messages yet.</div>
          ) : (
            messages.map((chat: any) => (
              <div
                key={chat.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: chat.sender_role === "dispatcher" ? "#eff6ff" : "#ecfeff",
                  border: "1px solid #e2e8f0"
                }}
              >
                <strong>{chat.sender_role || "user"}</strong>
                <div>{chat.message}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {chat.created_at ? new Date(chat.created_at).toLocaleString() : "Just now"}
                </div>
              </div>
            ))
          )}
        </div>

        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder="Send mission message..."
          style={{
            width: "100%",
            minHeight: 80,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            marginBottom: 8
          }}
        />

        <button
          type="button"
          onClick={sendMessage}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: 0,
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  );
}

