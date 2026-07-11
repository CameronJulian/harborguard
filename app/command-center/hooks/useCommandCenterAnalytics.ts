import { useMemo } from "react";

export function useCommandCenterAnalytics(
  threatFeed: any[]
) {

  const globalThreatScore = useMemo(() => {

    if (threatFeed.length === 0) {
      return 0;
    }

    const total = threatFeed.reduce(
      (sum, threat) =>
        sum + Number(threat.probability || 0),
      0
    );

    return Math.round(total / threatFeed.length);

  }, [threatFeed]);

  const topThreatVehicles = useMemo(() => {

    return [...threatFeed]
      .sort(
        (a, b) =>
          b.probability - a.probability
      )
      .slice(0, 5);

  }, [threatFeed]);

  const operationalStatus =
    globalThreatScore >= 80
      ? "CRITICAL"
      : globalThreatScore >= 60
      ? "HIGH ALERT"
      : globalThreatScore >= 40
      ? "ELEVATED"
      : "STABLE";

  const operationalColor =
    globalThreatScore >= 80
      ? "#dc2626"
      : globalThreatScore >= 60
      ? "#ea580c"
      : globalThreatScore >= 40
      ? "#d97706"
      : "#16a34a";

  return {

    globalThreatScore,

    topThreatVehicles,

    operationalStatus,

    operationalColor,

  };

}
