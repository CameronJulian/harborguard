type Props = {
  title?: string;
  description?: string;
  currentPlan?: string | null;
  trialEndsAt?: string | null;
};

function getDaysRemaining(trialEndsAt?: string | null) {
  if (!trialEndsAt) return null;

  const diff =
    new Date(trialEndsAt).getTime() - Date.now();

  const days = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  return days > 0 ? days : 0;
}

export default function PremiumGate({
  title = "Professional Feature",
  description = "Upgrade to HarborGuard Professional to access this feature.",
  currentPlan,
  trialEndsAt,
}: Props) {
  const daysRemaining =
    getDaysRemaining(trialEndsAt);

  return (
    <div
      className="
        rounded-2xl
        border
        border-yellow-300
        bg-yellow-50
        p-8
        text-center
      "
    >
      <div className="text-5xl mb-4">
        🔒
      </div>

      <h2 className="text-2xl font-bold mb-3">
        {title}
      </h2>

      <p className="text-gray-700 mb-6">
        {description}
      </p>

      {currentPlan && (
        <div
          className="
            mb-4
            text-sm
            font-medium
            text-gray-600
          "
        >
          Current Plan:{" "}
          <span className="font-bold capitalize">
            {currentPlan}
          </span>
        </div>
      )}

      {daysRemaining !== null && (
        <div
          className="
            mb-6
            text-sm
            text-orange-700
            font-semibold
          "
        >
          Trial ends in {daysRemaining} day
          {daysRemaining === 1 ? "" : "s"}
        </div>
      )}

      <a
        href="/billing"
        className="
          inline-block
          rounded-xl
          bg-black
          px-6
          py-3
          text-white
          font-semibold
          hover:opacity-90
          transition
        "
      >
        Upgrade to Professional
      </a>
    </div>
  );
}