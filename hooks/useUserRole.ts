"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  async function loadRole() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setRole(profile?.role || null);
    } finally {
      setLoading(false);
    }
  }

  return {
    role,
    loading,
  };
}