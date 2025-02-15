// src/services/indicators/macd.ts
export function calculateMACD(
  prices: number[],
  shortPeriod: number,
  longPeriod: number,
  signalPeriod: number,
): { macd: number; signal: number } {
  const shortEma = calculateEma(prices, shortPeriod);
  const longEma = calculateEma(prices, longPeriod);
  const macd = shortEma - longEma;
  const signal = calculateEma(
    [...Array(prices.length - signalPeriod).fill(0), macd],
    signalPeriod,
  );
  return { macd, signal };
}

function calculateEma(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const k = 2 / (period + 1);
  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * k + ema;
  }
  return ema;
}
