"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "soc";

const themes: { key: ThemeMode; label: string; description: string }[] = [
  {
    key: "light",
    label: "Light",
    description: "Default HarborGuard command view.",
  },
  {
    key: "dark",
    label: "Dark",
    description: "Reduced-glare dispatcher mode.",
  },
  {
    key: "soc",
    label: "SOC",
    description: "Security operations center wallboard mode.",
  },
];

export default function CommandCenterThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = localStorage.getItem("harborguard-command-theme") as ThemeMode | null;
    const nextTheme = saved || "light";

    setTheme(nextTheme);
    document.documentElement.setAttribute("data-command-theme", nextTheme);
  }, []);

  function applyTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    localStorage.setItem("harborguard-command-theme", nextTheme);
    document.documentElement.setAttribute("data-command-theme", nextTheme);
  }

  return (
    <section
      style={{
        padding: 18,
        borderRadius: 20,
        background: theme === "light" ? "#ffffff" : "#020617",
        color: theme === "light" ? "#0f172a" : "#ffffff",
        border: theme === "light" ? "1px solid #e5e7eb" : "1px solid #1e293b",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: theme === "light" ? "#2563eb" : "#38bdf8", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            COMMAND CENTER THEME
          </div>

          <h2 style={{ margin: 0, fontSize: 24 }}>Dark Mode Control</h2>

          <div style={{ color: theme === "light" ? "#64748b" : "#94a3b8", marginTop: 6 }}>
            Switch the Command Center between standard, dark, and SOC display modes.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {themes.map((item) => {
            const active = theme === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => applyTheme(item.key)}
                title={item.description}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: active ? "2px solid #38bdf8" : "1px solid #cbd5e1",
                  background: active ? "#0ea5e9" : theme === "light" ? "#f8fafc" : "#0f172a",
                  color: active ? "#ffffff" : theme === "light" ? "#0f172a" : "#e2e8f0",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
