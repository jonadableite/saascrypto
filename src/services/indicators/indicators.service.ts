// src/services/indicators/indicators.service.ts
export const Indicators = {
  calculateSma(prices: number[], period: number): number {
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  },

  calculateEma(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  },

  calculateRsi(prices: number[], period: number): number {
    const changes = prices
      .slice(1)
      .map((price, index) => price - prices[index]);
    const gains = changes.map((change) => (change > 0 ? change : 0));
    const losses = changes.map((change) => (change < 0 ? -change : 0));

    const avgGain = Indicators.calculateSma(gains, period);
    const avgLoss = Indicators.calculateSma(losses, period);

    const relativeStrength = avgGain / avgLoss;
    return 100 - 100 / (1 + relativeStrength);
  },
};
