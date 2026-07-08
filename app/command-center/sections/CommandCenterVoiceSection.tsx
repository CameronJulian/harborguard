type CommandCenterVoiceSectionProps = {
  voiceEnabled: boolean;
  voiceTranscript: string;
  copilotResponse: string;
  onToggleVoice: () => void;
};

export default function CommandCenterVoiceSection({
  voiceEnabled,
  voiceTranscript,
  copilotResponse,
  onToggleVoice,
}: CommandCenterVoiceSectionProps) {
  return (
    <div
      style={{
        padding: 24,
        marginBottom: 24,
        borderRadius: 20,
        background: "linear-gradient(135deg,#111827,#1e293b)",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8, fontWeight: 700 }}>
            AI VOICE COMMAND CENTER
          </div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>
            {voiceEnabled ? "VOICE ACTIVE" : "VOICE STANDBY"}
          </div>
        </div>

        <button
          onClick={onToggleVoice}
          style={{
            border: "none",
            borderRadius: 18,
            padding: "18px 24px",
            cursor: "pointer",
            fontWeight: 900,
            background: voiceEnabled ? "#dc2626" : "#2563eb",
            color: "#fff",
          }}
        >
          {voiceEnabled ? "Disable Voice AI" : "Enable Voice AI"}
        </button>
      </div>

      <div style={{ marginTop: 24, display: "grid", gap: 18 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
            LAST VOICE COMMAND
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {voiceTranscript || "Awaiting voice command..."}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
            AI RESPONSE
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7 }}>
            {copilotResponse || "AI operational response pending..."}
          </div>
        </div>
      </div>
    </div>
  );
}