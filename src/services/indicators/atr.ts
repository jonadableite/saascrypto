// src/services/indicators/atr.ts
export function calculateATR(
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  period: number,
): number {
  if (
    highPrices.length < period ||
    lowPrices.length < period ||
    closePrices.length < period
  )
    return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < period; i++) {
    const high = highPrices[highPrices.length - i];
    const low = lowPrices[lowPrices.length - i];
    const prevClose = closePrices[closePrices.length - i - 1];
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    trueRanges.push(tr);
  }

  return trueRanges.reduce((sum, tr) => sum + tr, 0) / period;
}
