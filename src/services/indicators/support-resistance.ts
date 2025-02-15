// src/services/indicators/support-resistance.ts
export function calculateSupportResistance(
  prices: number[],
  period: number,
): { support: number; resistance: number } {
  if (prices.length < period)
    return { support: 0, resistance: Number.POSITIVE_INFINITY };
  const recentPrices = prices.slice(-period);
  return {
    support: Math.min(...recentPrices),
    resistance: Math.max(...recentPrices),
  };
}
