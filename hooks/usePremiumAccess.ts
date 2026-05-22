"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function canAccessPremiumFeatures(
  status?: string | null,
  trialEndsAt?: string | null
) {
  if (status === "active") return true;

  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt) > new Date();
  }

  return false;
}

export function usePremiumAccess() {
  const [premiumAllowed, setPremiumAllowed] =
    useState(true);

  const [subscriptionLoaded, setSubscriptionLoaded] =
    useState(false);

  const [subscription, setSubscription] =
    useState<any>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setPremiumAllowed(false);
        setSubscriptionLoaded(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.organization_id) {
        setPremiumAllowed(false);
        setSubscriptionLoaded(true);
        return;
      }

      const { data: organization } =
        await supabase
          .from("organizations")
          .select(
            "subscription_status, plan, trial_ends_at"
          )
          .eq("id", profile.organization_id)
          .single();

      setSubscription(organization);

      setPremiumAllowed(
        canAccessPremiumFeatures(
          organization?.subscription_status,
          organization?.trial_ends_at
        )
      );
    } catch {
      setPremiumAllowed(false);
    } finally {
      setSubscriptionLoaded(true);
    }
  }

  return {
    premiumAllowed,
    subscriptionLoaded,
    subscription,
  };
}