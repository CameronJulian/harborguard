export function calculateRiskScore(
  catchValue: number,
  dockValue: number,
  storageValue: number,
  historicalLosses: number[]
) {
  const loss = catchValue - storageValue;
  const lossPercent = catchValue > 0 ? (loss / catchValue) * 100 : 0;

  let riskScore = 0;

  if (lossPercent > 20) riskScore += 50;
  else if (lossPercent > 10) riskScore += 25;
  else if (lossPercent > 5) riskScore += 10;

  if (catchValue > 1000) riskScore += 10;
  if (storageValue < dockValue) riskScore += 10;

  const avgLoss =
    historicalLosses.length > 0
      ? historicalLosses.reduce((sum, v) => sum + v, 0) / historicalLosses.length
      : 0;

  if (avgLoss > 0 && loss > avgLoss * 2) {
    riskScore += 30;
  }

  const status =
    riskScore > 70 ? "Flagged" :
    riskScore > 30 ? "Review" :
    "Normal";

  const riskLevel =
    riskScore > 70 ? "High" :
    riskScore > 30 ? "Medium" :
    "Low";

  return {
    loss,
    lossPercent,
    riskScore,
    status,
    riskLevel,
  };
}