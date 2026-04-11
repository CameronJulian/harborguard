"use client";

import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type SubscriptionRow = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  is_enabled: boolean;
  report_frequency: "daily" | "weekly";
  created_at?: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
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

export default function ReportSettingsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [reportFrequency, setReportFrequency] = useState<"daily" | "weekly">("daily");

  async function loadSubscriptions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("report_subscriptions")
      .select("id, user_id, email, full_name, is_enabled, report_frequency, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load subscriptions: ${error.message}`);
      setLoading(false);
      return;
    }

    setSubscriptions((data as SubscriptionRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function addSubscription(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setMessage("Email is required.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("report_subscriptions").insert({
      user_id: null,
      email: cleanEmail,
      full_name: cleanName || null,
      report_frequency: reportFrequency,
      is_enabled: true,
    });

    if (error) {
      setMessage(`Failed to add subscription: ${error.message}`);
      setSaving(false);
      return;
    }

    setEmail("");
    setFullName("");
    setReportFrequency("daily");
    setMessage("Subscription added successfully.");
    setSaving(false);
    await loadSubscriptions();
  }

  async function toggleEnabled(subscription: SubscriptionRow) {
    setMessage("");

    const { error } = await supabase
      .from("report_subscriptions")
      .update({ is_enabled: !subscription.is_enabled })
      .eq("id", subscription.id);

    if (error) {
      setMessage(`Failed to update subscription: ${error.message}`);
      return;
    }

    await loadSubscriptions();
  }

  async function changeFrequency(subscription: SubscriptionRow, frequency: "daily" | "weekly") {
    setMessage("");

    const { error } = await supabase
      .from("report_subscriptions")
      .update({ report_frequency: frequency })
      .eq("id", subscription.id);

    if (error) {
      setMessage(`Failed to change frequency: ${error.message}`);
      return;
    }

    await loadSubscriptions();
  }

  async function deleteSubscription(id: string) {
    setMessage("");

    const { error } = await supabase
      .from("report_subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`Failed to delete subscription: ${error.message}`);
      return;
    }

    await loadSubscriptions();
  }

  return (
    <AppShell>
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

      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>Report Settings</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Manage who receives scheduled analytics reports and how often they get them.
        </p>

        <form
          onSubmit={addSubscription}
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 180px auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Email</div>
            <input
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Full Name</div>
            <input
              style={inputStyle}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div>
            <div style={{ ...mutedTextStyle, marginBottom: 8, fontSize: 13 }}>Frequency</div>
            <select
              style={inputStyle}
              value={reportFrequency}
              onChange={(e) => setReportFrequency(e.target.value as "daily" | "weekly")}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <button type="submit" style={buttonStyle} disabled={saving}>
            {saving ? "Saving..." : "Add Subscription"}
          </button>
        </form>
      </div>

      <div style={{ ...cardStyle, padding: 26 }}>
        <h2 style={sectionTitleStyle}>Active Subscriptions</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Enable, disable, change frequency, or remove subscriptions.
        </p>

        {loading ? (
          <p style={mutedTextStyle}>Loading subscriptions...</p>
        ) : subscriptions.length === 0 ? (
          <p style={mutedTextStyle}>No subscriptions found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  {["Email", "Full Name", "Frequency", "Enabled", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderBottom: "1px solid #e5e7eb",
                        color: "#64748b",
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
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                      {subscription.email}
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {subscription.full_name || "-"}
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      <select
                        style={{ ...inputStyle, minWidth: 130 }}
                        value={subscription.report_frequency}
                        onChange={(e) =>
                          changeFrequency(
                            subscription,
                            e.target.value as "daily" | "weekly"
                          )
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        style={secondaryButtonStyle}
                        onClick={() => toggleEnabled(subscription)}
                      >
                        {subscription.is_enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>

                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        style={{
                          ...secondaryButtonStyle,
                          border: "1px solid #fecaca",
                          color: "#b91c1c",
                        }}
                        onClick={() => deleteSubscription(subscription.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}