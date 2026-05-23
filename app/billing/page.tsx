"use client";

import { supabase } from "@/lib/supabase";
import PermissionGate from "@/components/auth/PermissionGate";
import { useEffect, useState } from "react";

export default function BillingPage() {
  const [billingEmail, setBillingEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  async function loadOrganization() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) return;

    const { data } = await supabase
      .from("organizations")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setOrganization(data);
    }
  }

  const isProfessional =
    organization?.plan === "professional" &&
    organization?.subscription_status === "active";

  const planLabel = isProfessional
    ? "Professional Plan"
    : "Starter Plan";

  const statusLabel = isProfessional
    ? "Active subscription"
    : "Trial Active — 14 days remaining";

  const statusText = isProfessional
    ? "Active"
    : "Trialing";

  async function upgradeProfessional() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("You must be signed in to upgrade.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/billing/professional", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          billingEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to start checkout.");
        setLoading(false);
        return;
      }

      window.location.href = result.paymentUrl;
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-10 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-blue-100">
                Current Subscription
              </div>

              <h1 className="mt-2 text-5xl font-black">
                {planLabel}
              </h1>

              <p className="mt-4 text-lg text-blue-100">
                {statusLabel}
              </p>

              <p className="mt-2 text-blue-200">
                Status: {statusText}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <div className="text-sm uppercase tracking-wider text-blue-100">
                Organization Usage
              </div>

              <div className="mt-4 text-4xl font-black">
                12 Vehicles
              </div>

              <div className="mt-2 text-blue-100">
                4 / 10 seats used
              </div>
            </div>

          </div>
        </div>

        {/* TITLE */}

        <div className="mb-14 text-center">
          <h1 className="text-5xl font-black text-slate-900">
            HarborGuard Pricing
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-xl text-slate-600">
            Enterprise-grade fleet intelligence, predictive risk analytics,
            AI incident monitoring, and operational visibility for modern
            fish supply chain operations.
          </p>
        </div>

        {/* PRICING */}

        <div className="grid gap-8 lg:grid-cols-3">

          {/* STARTER */}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">
                Starter
              </h2>

              <p className="mt-2 text-slate-500">
                Small fleet monitoring
              </p>

              <div className="mt-6">
                <span className="text-5xl font-black text-slate-900">
                  R0
                </span>

                <span className="ml-2 text-slate-500">
                  /month
                </span>
              </div>
            </div>

            <ul className="space-y-4 text-slate-700">
              <li>✓ Up to 5 vehicles</li>
              <li>✓ Basic monitoring</li>
              <li>✓ Fleet alerts</li>
              <li>✓ Driver emergency tools</li>
              <li>✓ Geofence monitoring</li>
            </ul>

            <button
              className="
                mt-10
                w-full
                rounded-2xl
                border
                border-slate-300
                py-4
                font-semibold
                text-slate-700
              "
            >
              {isProfessional ? "Downgrade Required" : "Current Plan"}
            </button>
          </div>

          {/* PROFESSIONAL */}

          <PermissionGate
            permission="billing:manage"
            fallback={
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Only organization owners can manage billing.
              </div>
            }
          >
            <div
              className="
                relative
                rounded-3xl
                bg-black
                p-8
                text-white
                shadow-2xl
                ring-4
                ring-blue-500
              "
            >
              <div
                className="
                  absolute
                  right-4
                  top-4
                  rounded-full
                  bg-blue-500
                  px-4
                  py-1
                  text-sm
                  font-bold
                "
              >
                MOST POPULAR
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-bold">
                  Professional
                </h2>

                <p className="mt-2 text-slate-300">
                  Advanced fleet intelligence
                </p>

                <div className="mt-6">
                  <span className="text-5xl font-black">
                    R499
                  </span>

                  <span className="ml-2 text-slate-300">
                    /month
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-500/20 p-4 text-sm text-blue-100">
                  Includes AI Threat Intelligence, Route Replay,
                  Executive Fleet Analytics, and Predictive Risk Scoring.
                </div>
              </div>

              <ul className="space-y-4 text-slate-200">
                <li>✓ AI Copilot</li>
                <li>✓ Predictive Threat AI</li>
                <li>✓ Route Replay Intelligence</li>
                <li>✓ Unlimited alerts</li>
                <li>✓ Up to 50 vehicles</li>
                <li>✓ Executive reporting</li>
                <li>✓ AI incident narratives</li>
                <li>✓ Push notifications</li>
                <li>✓ Mobile PWA access</li>
              </ul>

              <div className="mt-8">
                <input
                  type="email"
                  placeholder="Billing email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="
                    mb-4
                    w-full
                    rounded-2xl
                    border
                    border-slate-700
                    bg-slate-900
                    px-4
                    py-4
                    text-white
                    outline-none
                  "
                />

                {error ? (
                  <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                {isProfessional ? (
                  <button
                    disabled
                    className="w-full rounded bg-gray-500 py-3 text-white"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={upgradeProfessional}
                    disabled={loading}
                    className="
                      w-full
                      rounded
                      bg-white
                      py-3
                      text-black
                      transition
                      hover:bg-slate-200
                      disabled:opacity-50
                    "
                  >
                    {loading
                      ? "Redirecting to PayFast..."
                      : "Upgrade to Professional"}
                  </button>
                )}
              </div>
            </div>
          </PermissionGate>

          {/* ENTERPRISE */}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">
                Enterprise
              </h2>

              <p className="mt-2 text-slate-500">
                Large-scale operations
              </p>

              <div className="mt-6">
                <span className="text-5xl font-black text-slate-900">
                  Custom
                </span>
              </div>
            </div>

            <ul className="space-y-4 text-slate-700">
              <li>✓ Unlimited vehicles</li>
              <li>✓ Enterprise fleet intelligence</li>
              <li>✓ Advanced operational analytics</li>
              <li>✓ Dedicated infrastructure</li>
              <li>✓ SLA support</li>
              <li>✓ Priority onboarding</li>
              <li>✓ Custom integrations</li>
              <li>✓ Executive AI reporting</li>
            </ul>

            <button
              className="
                mt-10
                w-full
                rounded-2xl
                bg-black
                py-4
                font-semibold
                text-white
              "
            >
              Contact Sales
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}