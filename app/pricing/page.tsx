export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "Free Trial",
      description:
        "Perfect for small fleets getting started with HarborGuard.",
      features: [
        "Up to 5 vehicles",
        "Basic fleet monitoring",
        "Live GPS tracking",
        "Incident logging",
        "14-day free trial",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "R4,999/mo",
      description:
        "Advanced operational intelligence for growing fleets.",
      features: [
        "Up to 50 vehicles",
        "AI incident narratives",
        "Route replay intelligence",
        "Risk dashboard",
        "Push notifications",
        "Executive analytics",
        "Export reporting",
        "Realtime command center",
      ],
      cta: "Upgrade to Professional",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Contact Sales",
      description:
        "Enterprise-grade maritime intelligence and operational control.",
      features: [
        "Unlimited vehicles",
        "Dedicated onboarding",
        "Custom integrations",
        "Advanced AI monitoring",
        "Enterprise seat licensing",
        "Priority support",
        "Custom analytics",
        "SLA + compliance tooling",
      ],
      cta: "Contact Sales",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "80px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 60,
          }}
        >
          <h1
            style={{
              fontSize: 56,
              marginBottom: 16,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            HarborGuard Pricing
          </h1>

          <p
            style={{
              fontSize: 20,
              color: "#475569",
              maxWidth: 760,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            AI-powered fleet intelligence, operational monitoring,
            and maritime risk management for modern fisheries
            and logistics operators.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(320px,1fr))",
            gap: 28,
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: "#fff",
                borderRadius: 28,
                padding: 32,
                border: plan.highlighted
                  ? "2px solid #0f172a"
                  : "1px solid #e2e8f0",
                boxShadow: plan.highlighted
                  ? "0 20px 40px rgba(15,23,42,0.08)"
                  : "0 10px 30px rgba(15,23,42,0.04)",
              }}
            >
              {plan.highlighted && (
                <div
                  style={{
                    display: "inline-block",
                    marginBottom: 18,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <h2
                style={{
                  fontSize: 32,
                  marginBottom: 10,
                  color: "#0f172a",
                }}
              >
                {plan.name}
              </h2>

              <div
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  marginBottom: 18,
                  color: "#0f172a",
                }}
              >
                {plan.price}
              </div>

              <p
                style={{
                  color: "#475569",
                  marginBottom: 28,
                  lineHeight: 1.6,
                }}
              >
                {plan.description}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginBottom: 32,
                }}
              >
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#0f172a",
                    }}
                  >
                    <span>✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 16,
                  border: "none",
                  background: plan.highlighted
                    ? "#0f172a"
                    : "#e2e8f0",
                  color: plan.highlighted
                    ? "#fff"
                    : "#0f172a",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}