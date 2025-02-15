// src/services/indicators/market-correlation.ts
export function calculateMarketCorrelation(
  assetPrices: number[],
  marketPrices: number[],
  period: number,
): number {
  if (assetPrices.length < period || marketPrices.length < period) return 0;

  const assetReturns = calculateReturns(assetPrices.slice(-period));
  const marketReturns = calculateReturns(marketPrices.slice(-period));

  const assetMean = mean(assetReturns);
  const marketMean = mean(marketReturns);

  let numerator = 0;
  let assetDenominator = 0;
  let marketDenominator = 0;

  for (let i = 0; i < period - 1; i++) {
    const assetDiff = assetReturns[i] - assetMean;
    const marketDiff = marketReturns[i] - marketMean;
    numerator += assetDiff * marketDiff;
    assetDenominator += assetDiff * assetDiff;
    marketDenominator += marketDiff * marketDiff;
  }

  return numerator / Math.sqrt(assetDenominator * marketDenominator);
}

function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
