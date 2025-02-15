// src/services/backtesting.service.ts

import { logger } from '../config/logger';
import { BinanceService } from './binance.service';
import { Indicators } from './indicators/indicators.service';

type Candle = [number, string, string, string, string, string, string, string];

export class BacktestingService {
  private binanceService: BinanceService;

  constructor(apiKey: string, apiSecret: string) {
    this.binanceService = new BinanceService(apiKey, apiSecret);
  }

  async runBacktest(
    symbol: string,
    startTime: number,
    endTime: number,
    interval: string,
    strategyParams: {
      smaPeriod: number;
      rsiPeriod: number;
      rsiOverbought: number;
      rsiOversold: number;
    },
  ) {
    try {
      // Buscar dados históricos da Binance
      const klines = await this.binanceService.getHistoricalKlines(
        symbol,
        interval,
        startTime,
        endTime,
      );

      if (!klines || klines.length === 0) {
        throw new Error('Não foi possível obter dados históricos');
      }

      const closePrices = klines.map((candle: Candle) =>
        Number.parseFloat(candle[4]),
      );

      let balance = 1000; // Saldo inicial
      let inPosition = false;
      let entryPrice = 0;
      const trades = [];

      for (
        let i = Math.max(strategyParams.smaPeriod, strategyParams.rsiPeriod);
        i < closePrices.length;
        i++
      ) {
        const currentPrice = closePrices[i];
        const sma = Indicators.calculateSma(
          closePrices.slice(0, i + 1),
          strategyParams.smaPeriod,
        );
        const rsi = Indicators.calculateRsi(
          closePrices.slice(0, i + 1),
          strategyParams.rsiPeriod,
        );

        if (
          !inPosition &&
          currentPrice > sma &&
          rsi < strategyParams.rsiOversold
        ) {
          // Sinal de compra
          inPosition = true;
          entryPrice = currentPrice;
          trades.push({
            type: 'COMPRAR',
            price: currentPrice,
            time: new Date(klines[i][0]),
          });
        } else if (
          inPosition &&
          currentPrice < sma &&
          rsi > strategyParams.rsiOverbought
        ) {
          // Sinal de venda
          inPosition = false;
          const profit = (currentPrice - entryPrice) / entryPrice;
          balance *= 1 + profit;
          trades.push({
            type: 'VENDER',
            price: currentPrice,
            time: new Date(klines[i][0]),
            profit,
          });
        }
      }

      // Se ainda estiver em posição no final do período, feche
      if (inPosition) {
        const lastPrice = closePrices[closePrices.length - 1];
        const profit = (lastPrice - entryPrice) / entryPrice;
        balance *= 1 + profit;
        trades.push({
          type: 'VENDER',
          price: lastPrice,
          time: new Date(klines[klines.length - 1][0]),
          profit,
        });
      }

      return {
        finalBalance: balance,
        trades,
        totalTrades: trades.length,
        profitableTrades: trades.filter(
          (t) =>
            t.type === 'VENDER' && typeof t.profit === 'number' && t.profit > 0,
        ).length,
        totalProfit: ((balance - 1000) / 1000) * 100,
      };
    } catch (error) {
      logger.error(`❌ Erro durante o backtesting para ${symbol}:`, error);
      throw error;
    }
  }
}
