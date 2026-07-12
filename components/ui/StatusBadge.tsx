type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  label: string;
  tone?: StatusTone;
};

const tones: Record<
  StatusTone,
  {
    background: string;
    border: string;
    color: string;
  }
> = {
  neutral: {
    background: "#f1f5f9",
    border: "#cbd5e1",
    color: "#475569",
  },
  success: {
    background: "#dcfce7",
    border: "#86efac",
    color: "#166534",
  },
  warning: {
    background: "#fef3c7",
    border: "#fcd34d",
    color: "#92400e",
  },
  danger: {
    background: "#fee2e2",
    border: "#fca5a5",
    color: "#991b1b",
  },
  info: {
    background: "#dbeafe",
    border: "#93c5fd",
    color: "#1d4ed8",
  },
};

export default function StatusBadge({
  label,
  tone = "neutral",
}: Props) {
  const theme = tones[tone];

  return (
    <span
      style={{
        alignItems: "center",
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        color: theme.color,
        display: "inline-flex",
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1,
        padding: "7px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
