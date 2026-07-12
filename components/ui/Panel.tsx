import type {
  CSSProperties,
  ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  padding?: number;
  style?: CSSProperties;
};

export default function Panel({
  children,
  title,
  description,
  actions,
  padding = 24,
  style,
}: Props) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
        ...style,
      }}
    >
      {title || description || actions ? (
        <header
          style={{
            alignItems: "flex-start",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: 16,
            justifyContent: "space-between",
            padding: "20px 24px",
          }}
        >
          <div>
            {title ? (
              <h2
                style={{
                  color: "#0f172a",
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: title ? "6px 0 0" : 0,
                }}
              >
                {description}
              </p>
            ) : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}

      <div style={{ padding }}>
        {children}
      </div>
    </section>
  );
}
