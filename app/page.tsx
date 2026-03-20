"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type BatchRow = {
  id: string;
  batch_code: string | null;
  vessel: string | null;
  species: string | null;
  catch_kg: number | null;
  dock_kg: number | null;
  storage_kg: number | null;
  status: string | null;
  created_at: string | null;
};

type IncidentRow = {
  id: string;
  incident_code: string | null;
  severity: string | null;
  status: string | null;
  summary: string | null;
  created_at: string | null;
};

type ViewSection = "dashboard" | "batches" | "incidents";

const supabaseClient = supabase;

const pageStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  background: "#f3f4f6",
  minHeight: "100vh",
  color: "#111827",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  margin: "0 0 8px 0",
  lineHeight: 1.2,
};

const mutedTextStyle: CSSProperties = {
  color: "#6b7280",
  margin: 0,
};

const labelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  marginBottom: 6,
  display: "block",
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState<ViewSection>("dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [vessel, setVessel] = useState("");
  const [species, setSpecies] = useState("");
  const [catchKg, setCatchKg] = useState("");
  const [dockKg, setDockKg] = useState("");
  const [storageKg, setStorageKg] = useState("");

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(window.innerWidth < 980);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadBatches() {
    const { data, error } = await supabaseClient
      .from("batches")
      .select("id, batch_code, vessel, species, catch_kg, dock_kg, storage_kg, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Load batches failed: ${error.message}`);
      return;
    }

    setBatches((data as BatchRow[]) || []);
  }

  async function loadIncidents() {
    const { data, error } = await supabaseClient
      .from("incidents")
      .select("id, incident_code, severity, status, summary, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Load incidents failed: ${error.message}`);
      return;
    }

    setIncidents((data as IncidentRow[]) || []);
  }

  async function loadAll() {
    await Promise.all([loadBatches(), loadIncidents()]);
  }

  useEffect(() => {
    if (session) {
      loadAll();
    }
  }, [session]);

  const totalCatch = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.catch_kg || 0), 0),
    [batches]
  );

  const totalStored = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.storage_kg || 0), 0),
    [batches]
  );

  const openIncidents = useMemo(
    () => incidents.filter((i) => i.status === "Open").length,
    [incidents]
  );

  const chartData = [...batches]
    .reverse()
    .map((b) => ({
      name: b.batch_code?.slice(-4) || "N/A",
      catch: b.catch_kg || 0,
      storage: b.storage_kg || 0,
    }));

  const statusData = [
    { name: "Normal", value: batches.filter((b) => b.status === "Normal").length },
    { name: "Flagged", value: batches.filter((b) => b.status === "Flagged").length },
    { name: "Review", value: batches.filter((b) => b.status === "Review").length },
  ];

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Sign up failed: ${error.message}`);
      return;
    }

    setMessage("Sign up successful. You can now sign in if email confirmation is off.");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Sign in failed: ${error.message}`);
      return;
    }

    setMessage("Signed in successfully.");
  }

  async function handleSignOut() {
    await supabaseClient.auth.signOut();
    setMessage("Signed out.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!vessel || !species || !catchKg || !dockKg || !storageKg) {
      setMessage("Please fill in all fields.");
      return;
    }

    const catchValue = Number(catchKg);
    const dockValue = Number(dockKg);
    const storageValue = Number(storageKg);

    if (
      Number.isNaN(catchValue) ||
      Number.isNaN(dockValue) ||
      Number.isNaN(storageValue)
    ) {
      setMessage("Catch, Dock, and Storage must be numbers.");
      return;
    }

    const loss = catchValue - storageValue;
    const status = loss > 25 ? "Flagged" : loss > 5 ? "Review" : "Normal";
    const batchCode = `BAT-${Date.now()}`;
    const qrCode = `HG-${batchCode}`;

    setLoading(true);

    const { error } = await supabaseClient.from("batches").insert({
      batch_code: batchCode,
      vessel,
      species,
      catch_kg: catchValue,
      dock_kg: dockValue,
      storage_kg: storageValue,
      handler_name: "Cameron Hendrick",
      handler_role: "manager",
      location: "Main Warehouse",
      notes: "",
      qr_code: qrCode,
      status,
      created_by: null,
    });

    if (error) {
      setLoading(false);
      setMessage(`Save failed: ${error.message}`);
      return;
    }

    if (status === "Flagged") {
      await supabaseClient.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel} / ${species}`,
      });
    }

    await supabaseClient.from("audit_logs").insert({
      actor_name: session?.user.email || "Unknown",
      action: "Created batch",
      batch_code: batchCode,
      risk: status === "Flagged" ? "High" : status === "Review" ? "Medium" : "Low",
    });

    setVessel("");
    setSpecies("");
    setCatchKg("");
    setDockKg("");
    setStorageKg("");
    setMessage("Batch saved successfully.");

    await loadAll();
    setLoading(false);
  }

  async function resolveIncident(id: string) {
    const { error } = await supabaseClient
      .from("incidents")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (error) {
      setMessage(`Resolve failed: ${error.message}`);
      return;
    }

    await supabaseClient.from("audit_logs").insert({
      actor_name: session?.user.email || "Unknown",
      action: "Resolved incident",
      batch_code: null,
      risk: "Low",
    });

    setMessage("Incident resolved.");
    await loadIncidents();
  }

  function statusColor(status: string | null) {
    if (status === "Flagged" || status === "Open") return "#dc2626";
    if (status === "Review") return "#d97706";
    if (status === "Normal" || status === "Resolved") return "#16a34a";
    return "#111827";
  }

  function sidebarButtonStyle(section: ViewSection): CSSProperties {
    const active = activeSection === section;
    return {
      width: "100%",
      textAlign: "left",
      padding: "12px 14px",
      borderRadius: 12,
      border: active ? "1px solid #bfdbfe" : "1px solid transparent",
      background: active ? "#dbeafe" : "transparent",
      color: active ? "#1d4ed8" : "#111827",
      fontWeight: active ? 800 : 600,
      cursor: "pointer",
    };
  }

  if (authLoading) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 420, margin: "80px auto 0", ...cardStyle, padding: 32, textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>HarborGuard</h1>
          <p style={mutedTextStyle}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 470, margin: "60px auto 0", ...cardStyle, padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 42, margin: "0 0 8px 0", lineHeight: 1.05 }}>HarborGuard</h1>
            <p style={{ ...mutedTextStyle, fontSize: 18 }}>
              Sign in to access the Fish Supply Chain Monitoring System.
            </p>
          </div>

          <form onSubmit={handleSignIn} style={{ display: "grid", gap: 12 }}>
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" style={primaryButtonStyle}>
              Sign In
            </button>
            <button type="button" onClick={handleSignUp} style={secondaryButtonStyle}>
              Sign Up
            </button>
          </form>

          {message ? (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
              }}
            >
              {message}
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
          gap: 24,
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <aside
          style={{
            ...cardStyle,
            padding: 20,
            alignSelf: "start",
            position: isMobile ? "static" : "sticky",
            top: 20,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 34, lineHeight: 1.05, margin: "0 0 8px 0" }}>HarborGuard</h1>
            <p style={mutedTextStyle}>Fish Supply Chain Monitoring System</p>
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
            <button style={sidebarButtonStyle("dashboard")} onClick={() => setActiveSection("dashboard")}>
              Dashboard
            </button>
            <button style={sidebarButtonStyle("batches")} onClick={() => setActiveSection("batches")}>
              Recent Batches
            </button>
            <button style={sidebarButtonStyle("incidents")} onClick={() => setActiveSection("incidents")}>
              Incident Management
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: 18,
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Signed in as</div>
            <div style={{ fontWeight: 700, wordBreak: "break-word", marginBottom: 12 }}>
              {session.user.email}
            </div>
            <button onClick={handleSignOut} style={secondaryButtonStyle}>
              Sign Out
            </button>
          </div>
        </aside>

        <section style={{ minWidth: 0 }}>
          {message ? (
            <div
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 12,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
              }}
            >
              {message}
            </div>
          ) : null}

          {activeSection === "dashboard" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 20,
                  marginBottom: 28,
                }}
              >
                {[
                  { label: "Total Catch", value: `${totalCatch} kg` },
                  { label: "Stored", value: `${totalStored} kg` },
                  { label: "Open Incidents", value: openIncidents },
                ].map((card, index) => (
                  <div key={index} style={{ ...cardStyle, padding: 24 }}>
                    <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 10 }}>{card.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>{card.value}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1.45fr 1fr",
                  gap: 20,
                }}
              >
                <div style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={sectionTitleStyle}>Analytics</h2>
                  <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
                    Catch volume and storage behaviour across recent batches.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 16,
                        height: 320,
                        background: "#fff",
                      }}
                    >
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Catch vs Storage</h3>
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="catch" stroke="#2563eb" strokeWidth={3} />
                          <Line type="monotone" dataKey="storage" stroke="#16a34a" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 16,
                        height: 320,
                        background: "#fff",
                      }}
                    >
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Status Distribution</h3>
                      <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={statusData}>
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={sectionTitleStyle}>Create Batch</h2>
                  <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
                    Capture a new fish supply batch for monitoring.
                  </p>

                  <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Vessel</label>
                      <input
                        style={inputStyle}
                        placeholder="Vessel"
                        value={vessel}
                        onChange={(e) => setVessel(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Species</label>
                      <input
                        style={inputStyle}
                        placeholder="Species"
                        value={species}
                        onChange={(e) => setSpecies(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Catch kg</label>
                      <input
                        style={inputStyle}
                        placeholder="Catch kg"
                        value={catchKg}
                        onChange={(e) => setCatchKg(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Dock kg</label>
                      <input
                        style={inputStyle}
                        placeholder="Dock kg"
                        value={dockKg}
                        onChange={(e) => setDockKg(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Storage kg</label>
                      <input
                        style={inputStyle}
                        placeholder="Storage kg"
                        value={storageKg}
                        onChange={(e) => setStorageKg(e.target.value)}
                      />
                    </div>

                    <button type="submit" disabled={loading} style={primaryButtonStyle}>
                      {loading ? "Saving..." : "Save Batch"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}

          {activeSection === "batches" && (
            <div style={{ ...cardStyle, padding: 24 }}>
              <h2 style={sectionTitleStyle}>Recent Batches</h2>
              <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
                Latest recorded supply batches and risk status.
              </p>

              {batches.length === 0 ? (
                <p style={mutedTextStyle}>No batches saved yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                    <thead>
                      <tr>
                        {["Batch", "Vessel", "Species", "Catch", "Dock", "Storage", "Status"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: 14,
                              borderBottom: "1px solid #e5e7eb",
                              color: "#6b7280",
                              fontSize: 13,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.id}>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                            {batch.batch_code}
                          </td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{batch.vessel}</td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{batch.species}</td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{batch.catch_kg}</td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{batch.dock_kg}</td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{batch.storage_kg}</td>
                          <td
                            style={{
                              padding: 14,
                              borderBottom: "1px solid #f3f4f6",
                              color: statusColor(batch.status),
                              fontWeight: 800,
                            }}
                          >
                            {batch.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSection === "incidents" && (
            <div style={{ ...cardStyle, padding: 24 }}>
              <h2 style={sectionTitleStyle}>Incident Management</h2>
              <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
                Review flagged incidents and resolve them when handled.
              </p>

              {incidents.length === 0 ? (
                <p style={mutedTextStyle}>No incidents yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                    <thead>
                      <tr>
                        {["Incident", "Severity", "Status", "Summary", "Action"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: 14,
                              borderBottom: "1px solid #e5e7eb",
                              color: "#6b7280",
                              fontSize: 13,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => (
                        <tr key={incident.id}>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                            {incident.incident_code}
                          </td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{incident.severity}</td>
                          <td
                            style={{
                              padding: 14,
                              borderBottom: "1px solid #f3f4f6",
                              color: statusColor(incident.status),
                              fontWeight: 800,
                            }}
                          >
                            {incident.status}
                          </td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>{incident.summary}</td>
                          <td style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>
                            {incident.status !== "Resolved" ? (
                              <button
                                onClick={() => resolveIncident(incident.id)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: "#111827",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                }}
                              >
                                Resolve
                              </button>
                            ) : (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>Done</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}