"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Props = {
  children: ReactNode;
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
  paddingLeft: 20,
  paddingRight: 20,
  paddingBottom: 20,
  paddingTop: 20,
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function AppShell({ children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
      } else {
        setSession(data.session);
      }
      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession) {
        router.replace("/");
      } else {
        setSession(currentSession);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (checking) {
    return (
      <main style={pageStyle}>
        <div style={{ ...shellStyle, textAlign: "center", paddingTop: 90 }}>
          <div style={{ ...cardStyle, padding: 36, maxWidth: 460, margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, fontSize: 44 }}>HarborGuard</h1>
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
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
              <div style={{ fontSize: 14, color: "#64748b" }}>Fish Supply Chain Monitoring System</div>
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
              email={session?.user.email}
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