import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: Props) {
  return (
    <header
      style={{
        alignItems: "flex-start",
        display: "flex",
        gap: 20,
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <div>
        {eyebrow ? (
          <div
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <h1
          style={{
            color: "#0f172a",
            fontSize: 30,
            fontWeight: 850,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          {title}
        </h1>

        {description ? (
          <p
            style={{
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.65,
              margin: "8px 0 0",
              maxWidth: 760,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div>{actions}</div> : null}
    </header>
  );
}
