"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Props = {
  children: ReactNode;
};

type UserRole = "admin" | "manager" | "viewer";

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string | null;
};

const pageStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  minHeight: "100vh",
  color: "#0f172a",
};

const shellStyle: CSSProperties = {
  maxWidth: 1450,
  margin: "0 auto",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function AppShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  async function loadProfileRole(userId: string) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", userId)
        .single();

      if (data) {
        const profile = data as ProfileRow;
        setRole(profile.role || "admin");
      } else {
        setRole("admin");
      }
    } catch {
      setRole("admin");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!currentSession) {
        setSession(null);
        setRole(null);
        setChecking(false);
        router.replace("/");
        return;
      }

      setSession(currentSession);
      loadProfileRole(currentSession.user.id); // non-blocking
      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;

      if (!currentSession) {
        setSession(null);
        setRole(null);
        setChecking(false);
        router.replace("/");
        return;
      }

      setSession(currentSession);
      loadProfileRole(currentSession.user.id);
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    router.replace("/");
  }

  // ✅ FIXED: no padding conflict anymore
  if (checking || !session) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            ...shellStyle,
            textAlign: "center",
            paddingTop: 90,
            paddingBottom: 20,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div style={{ ...cardStyle, padding: 36, maxWidth: 460, margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, fontSize: 44 }}>HarborGuard</h1>
            <p style={{ color: "#64748b", margin: 0 }}>
              Loading secure workspace...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          ...shellStyle,
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        {isMobile && (
          <div
            style={{
              ...cardStyle,
              padding: 16,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>HarborGuard</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>
                Fish Supply Chain Monitoring System
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {sidebarOpen ? "Close" : "Menu"}
            </button>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
            gap: 24,
          }}
        >
          {(!isMobile || sidebarOpen) && (
            <Sidebar
              email={session.user.email}
              role={role}
              onSignOut={handleSignOut}
              isMobile={isMobile}
              onNavigate={() => {
                if (isMobile) setSidebarOpen(false);
              }}
            />
          )}

          <section style={{ minWidth: 0 }}>{children}</section>
        </div>
      </div>
    </main>
  );
}