type Props = {
  trialEndsAt?: string | null;
};

export default function TrialBanner({
  trialEndsAt,
}: Props) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);

  const diffMs =
    end.getTime() - now.getTime();

  const daysLeft = Math.max(
    0,
    Math.ceil(
      diffMs / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="mb-4 rounded-xl border border-yellow-400 bg-yellow-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-yellow-900">
            HarborGuard Professional Trial
          </h2>

          <p className="text-sm text-yellow-800">
            {daysLeft > 0
              ? `${daysLeft} day(s) remaining in your free trial.`
              : "Your trial has expired."}
          </p>
        </div>

        <a
          href="/billing"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Upgrade
        </a>
      </div>
    </div>
  );
}