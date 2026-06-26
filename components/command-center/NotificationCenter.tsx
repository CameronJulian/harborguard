"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

type Notification = {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    unreadCount: 0,
    criticalCount: 0,
    total: 0,
  });

  async function loadNotifications() {
    try {
      const response = await fetchWithAuth(
        "/api/command-center/notifications",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setNotifications(result.notifications || []);
        setStats(
          result.stats || {
            unreadCount: 0,
            criticalCount: 0,
            total: 0,
          }
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function markRead(id: string) {
    await fetchWithAuth("/api/command-center/notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: id,
      }),
    });

    loadNotifications();
  }

  async function resolve(id: string) {
    await fetchWithAuth("/api/command-center/notifications/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: id,
      }),
    });

    loadNotifications();
  }

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        background: "#fff",
      }}
    >
      <h2>Notification Center</h2>

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <strong>Unread: {stats.unreadCount}</strong>
        <strong>Critical: {stats.criticalCount}</strong>
        <strong>Total: {stats.total}</strong>
      </div>

      {notifications.length === 0 ? (
        <div>No active notifications.</div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <strong>{n.title}</strong>

            <div>{n.message}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              {!n.is_read && (
                <button onClick={() => markRead(n.id)}>
                  Mark Read
                </button>
              )}

              {!n.is_resolved && (
                <button onClick={() => resolve(n.id)}>
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
