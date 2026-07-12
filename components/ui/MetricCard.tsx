import type { ReactNode } from "react";

type MetricTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
};

const accents: Record<MetricTone, string> = {
  neutral: "#475569",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#2563eb",
};

export default function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: Props) {
  const accent = accents[tone];

  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        minWidth: 0,
        padding: 20,
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          gap: 14,
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#64748b",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {label}
          </div>

          <div
            style={{
              color: "#0f172a",
              fontSize: 34,
              fontWeight: 850,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {value}
          </div>

          {detail ? (
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 10,
              }}
            >
              {detail}
            </div>
          ) : null}
        </div>

        {icon ? (
          <div
            style={{
              alignItems: "center",
              background: `${accent}14`,
              borderRadius: 14,
              color: accent,
              display: "flex",
              height: 44,
              justifyContent: "center",
              width: 44,
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div
        style={{
          background: accent,
          borderRadius: 999,
          height: 4,
          marginTop: 18,
          width: 42,
        }}
      />
    </article>
  );
}
