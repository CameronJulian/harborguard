export default function BillingPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        HarborGuard Pricing
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        <div className="border rounded-2xl p-6">
          <h2 className="text-2xl font-bold">
            Starter
          </h2>

          <p className="text-4xl font-bold mt-4">
            R0
          </p>

          <ul className="mt-6 space-y-2">
            <li>✓ 5 vehicles</li>
            <li>✓ Basic monitoring</li>
            <li>✓ Alerts</li>
          </ul>

          <button className="mt-6 w-full border rounded-xl py-3">
            Current Plan
          </button>
        </div>

        <div className="border rounded-2xl p-6 bg-black text-white">
          <h2 className="text-2xl font-bold">
            Professional
          </h2>

          <p className="text-4xl font-bold mt-4">
            R2,499
          </p>

          <p>/month</p>

          <ul className="mt-6 space-y-2">
            <li>✓ AI Copilot</li>
            <li>✓ Route Replay</li>
            <li>✓ Predictive Threat AI</li>
            <li>✓ Unlimited Alerts</li>
            <li>✓ 50 Vehicles</li>
          </ul>

          <a
            href="/api/billing/professional"
            className="block mt-6 w-full bg-white text-black rounded-xl py-3 text-center font-semibold"
          >
            Upgrade
          </a>
        </div>

        <div className="border rounded-2xl p-6">
          <h2 className="text-2xl font-bold">
            Enterprise
          </h2>

          <p className="text-4xl font-bold mt-4">
            Custom
          </p>

          <ul className="mt-6 space-y-2">
            <li>✓ Unlimited Vehicles</li>
            <li>✓ Fleet Intelligence</li>
            <li>✓ Executive Reports</li>
            <li>✓ SLA Support</li>
          </ul>

          <button className="mt-6 w-full bg-black text-white rounded-xl py-3">
            Contact Sales
          </button>
        </div>

      </div>
    </div>
  );
}