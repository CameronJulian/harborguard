"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { fetchWithAuth } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";

export default function InvitationAcceptancePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const token =
    typeof params?.token === "string"
      ? params.token.trim()
      : "";

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [accepting, setAccepting] =
    useState(false);

  const [accepted, setAccepted] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (!session?.access_token) {
        const destination =
          token
            ? `/invite/${token}`
            : "/";

        router.replace(
          `/?redirectedFrom=${encodeURIComponent(destination)}`,
        );

        return;
      }

      setCheckingSession(false);
    }

    verifySession();

    return () => {
      active = false;
    };
  }, [router, token]);

  async function acceptInvitation() {
    if (!token || accepting || accepted) {
      return;
    }

    setAccepting(true);
    setMessage("");

    try {
      const response = await fetchWithAuth(
        "/api/organization-invitations/accept",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Unable to accept invitation.",
        );

        return;
      }

      setAccepted(true);
      setMessage(
        "Invitation accepted. Your HarborGuard organization membership is now active.",
      );
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to accept invitation.",
      );
    } finally {
      setAccepting(false);
    }
  }

  if (checkingSession) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f7fb",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 36,
            borderRadius: 20,
            maxWidth: 520,
            width: "100%",
            boxShadow:
              "0 20px 40px rgba(15,23,42,0.08)",
          }}
        >
          <h1>HarborGuard Invitation</h1>
          <p>Checking your session...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f4f7fb",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 36,
          borderRadius: 20,
          maxWidth: 560,
          width: "100%",
          boxShadow:
            "0 20px 40px rgba(15,23,42,0.08)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            fontSize: 36,
            color: "#0f172a",
          }}
        >
          Join HarborGuard
        </h1>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          You have been invited to join a HarborGuard
          organization. Acceptance is bound to the email
          address of your authenticated account.
        </p>

        {message && (
          <div
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 12,
              background: accepted
                ? "#f0fdf4"
                : "#eff6ff",
              color: accepted
                ? "#166534"
                : "#1d4ed8",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        {!accepted ? (
          <button
            type="button"
            onClick={acceptInvitation}
            disabled={accepting || !token}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background:
                "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor:
                accepting || !token
                  ? "not-allowed"
                  : "pointer",
              opacity:
                accepting || !token
                  ? 0.65
                  : 1,
            }}
          >
            {accepting
              ? "Accepting invitation..."
              : "Accept Invitation"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              router.replace("/dashboard")
            }
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background:
                "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Continue to Dashboard
          </button>
        )}
      </div>
    </main>
  );
}
