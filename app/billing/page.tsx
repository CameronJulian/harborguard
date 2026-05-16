export default function BillingPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">

        <div className="text-center mb-14">
          <h1 className="text-5xl font-black text-slate-900">
            HarborGuard Pricing
          </h1>

          <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
            Enterprise-grade fleet intelligence, predictive risk analytics,
            AI incident monitoring, and operational visibility for modern
            fish supply chain operations.
          </p>
        </div>

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

                <span className="text-slate-500 ml-2">
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
              Current Plan
            </button>
          </div>

          {/* PROFESSIONAL */}

          <div
            className="
              rounded-3xl
              bg-black
              p-8
              text-white
              shadow-2xl
              ring-4
              ring-blue-500
              relative
            "
          >
            <div
              className="
                absolute
                top-4
                right-4
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
                  R2,499
                </span>

                <span className="ml-2 text-slate-300">
                  /month
                </span>
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

            <a
              href="/api/billing/professional"
              className="
                mt-10
                block
                w-full
                rounded-2xl
                bg-white
                py-4
                text-center
                font-bold
                text-black
                transition
                hover:bg-slate-200
              "
            >
              Upgrade to Professional
            </a>
          </div>

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

        <div className="mt-16 text-center text-slate-500 text-sm">
          HarborGuard Professional includes a 14-day free trial.
        </div>

      </div>
    </div>
  );
}