type Props = {
  title?: string;
  description?: string;
};

export default function PremiumGate({
  title = "Professional Feature",
  description = "Upgrade to HarborGuard Professional to access this feature.",
}: Props) {
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
        "
      >
        Upgrade to Professional
      </a>
    </div>
  );
}