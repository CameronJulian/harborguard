"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

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

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadBatches() {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Sign up failed: ${error.message}`);
      return;
    }

    setMessage("Sign up successful. Check your email if confirmation is enabled.");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
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
    await supabase.auth.signOut();
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

    const { error } = await supabase.from("batches").insert({
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
      await supabase.from("incidents").insert({
        incident_code: `INC-${Date.now()}`,
        severity: "High",
        status: "Open",
        summary: `${loss}kg discrepancy detected for ${vessel} / ${species}`,
      });
    }

    await supabase.from("audit_logs").insert({
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
    const { error } = await supabase
      .from("incidents")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (error) {
      setMessage(`Resolve failed: ${error.message}`);
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_name: session?.user.email || "Unknown",
      action: "Resolved incident",
      batch_code: null,
      risk: "Low",
    });

    setMessage("Incident resolved.");
    await loadIncidents();
  }

  function statusColor(status: string | null) {
    if (status === "Flagged" || status === "Open") return "#b91c1c";
    if (status === "Review") return "#b45309";
    if (status === "Normal" || status === "Resolved") return "#15803d";
    return "#111827";
  }

  if (authLoading) {
    return <main style={{ fontFamily: "Arial", padding: 40 }}>Loading...</main>;
  }

  if (!session) {
    return (
      <main style={{ fontFamily: "Arial", padding: 40, maxWidth: 420, margin: "auto" }}>
        <h1>HarborGuard</h1>
        <p>Sign in to access the Fish Supply Chain Monitoring System.</p>

        <form onSubmit={handleSignIn} style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Sign In</button>
          <button type="button" onClick={handleSignUp}>Sign Up</button>
        </form>

        {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "Arial", padding: 40, maxWidth: 1100, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>HarborGuard</h1>
          <p>Fish Supply Chain Monitoring System</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}>{session.user.email}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>

      <hr />

      <h2>Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <div style={{ border: "1px solid #ccc", padding: 20, borderRadius: 10 }}>
          <h3>Total Catch</h3>
          <p>{totalCatch} kg</p>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 20, borderRadius: 10 }}>
          <h3>Stored</h3>
          <p>{totalStored} kg</p>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 20, borderRadius: 10 }}>
          <h3>Open Incidents</h3>
          <p>{openIncidents}</p>
        </div>
      </div>

      <hr style={{ marginTop: 40 }} />

      <h2>Create Batch</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <input placeholder="Vessel" value={vessel} onChange={(e) => setVessel(e.target.value)} />
        <input placeholder="Species" value={species} onChange={(e) => setSpecies(e.target.value)} />
        <input placeholder="Catch kg" value={catchKg} onChange={(e) => setCatchKg(e.target.value)} />
        <input placeholder="Dock kg" value={dockKg} onChange={(e) => setDockKg(e.target.value)} />
        <input placeholder="Storage kg" value={storageKg} onChange={(e) => setStorageKg(e.target.value)} />
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Batch"}
        </button>
      </form>

      {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}

      <hr style={{ marginTop: 40 }} />

      <h2>Recent Batches</h2>

      {batches.length === 0 ? (
        <p>No batches saved yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 40 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Batch</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Vessel</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Species</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Catch</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Dock</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Storage</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.batch_code}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.vessel}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.species}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.catch_kg}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.dock_kg}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{batch.storage_kg}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8, color: statusColor(batch.status), fontWeight: 700 }}>
                  {batch.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Incident Management</h2>

      {incidents.length === 0 ? (
        <p>No incidents yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Incident</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Severity</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Summary</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{incident.incident_code}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{incident.severity}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8, color: statusColor(incident.status), fontWeight: 700 }}>
                  {incident.status}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{incident.summary}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {incident.status !== "Resolved" ? (
                    <button onClick={() => resolveIncident(incident.id)}>Resolve</button>
                  ) : (
                    "Done"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}