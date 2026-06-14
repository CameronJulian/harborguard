"use client";

import { fetchWithAuth } from "@/lib/auth-fetch";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [message, setMessage] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    setLoading(true);
    setMessage("");

    const response = await fetchWithAuth("/api/organization-invitations", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to load invitations.");
      setLoading(false);
      return;
    }

    setInvitations(result.invitations || []);
    setLoading(false);
  }

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLastInviteUrl("");

    const response = await fetchWithAuth("/api/organization-invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, role }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to create invitation.");
      return;
    }

    setEmail("");
    setRole("viewer");
    setLastInviteUrl(result.inviteUrl || "");
    setMessage("Invitation created successfully.");
    await loadInvitations();
  }

  async function deleteInvitation(id: string) {
    const confirmed = window.confirm("Delete this invitation?");
    if (!confirmed) return;

    const response = await fetch(`/api/organization-invitations?id=${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to delete invitation.");
      return;
    }

    setMessage("Invitation deleted.");
    await loadInvitations();
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1100 }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 8 }}>
          Organization Invitations
        </h1>

        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Invite users to join your HarborGuard organization.
        </p>

        {message && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#eff6ff",
              color: "#1d4ed8",
              marginBottom: 18,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        {lastInviteUrl && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#f0fdf4",
              color: "#166534",
              marginBottom: 18,
              wordBreak: "break-all",
            }}
          >
            Invite link: {lastInviteUrl}
          </div>
        )}

        <form
          onSubmit={createInvitation}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 24,
            marginBottom: 28,
            display: "grid",
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24 }}>Invite User</h2>

          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 15,
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 15,
            }}
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Create Invitation
          </button>
        </form>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Pending Invitations</h2>

          {loading ? (
            <p>Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p style={{ color: "#64748b" }}>No invitations found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Email", "Role", "Status", "Expires", "Action"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => {
                    const expired = new Date(invite.expires_at) < new Date();
                    const status = invite.accepted_at
                      ? "Accepted"
                      : expired
                      ? "Expired"
                      : "Pending";

                    return (
                      <tr key={invite.id}>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {invite.email}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {invite.role}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {status}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          <button
                            onClick={() => deleteInvitation(invite.id)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid #fecaca",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


