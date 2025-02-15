// src/services/strategy/sma-rsi.strategy.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';
import { Indicators } from '../../services/indicators/indicators.service';
import type { BinanceService } from '../binance.service';

const prisma = new PrismaClient();

type Candle = [number, string, string, string, string, string, number, string];

export class SmaRsiStrategy {
  private binanceService: BinanceService;
  private symbol: string;
  private smaPeriod: number;
  private rsiPeriod: number;
  private rsiOverbought: number;
  private rsiOversold: number;
  private botId: string;

  constructor(
    binanceService: BinanceService,
    botId: string,
    symbol: string,
    smaPeriod: number,
    rsiPeriod: number,
    rsiOverbought: number,
    rsiOversold: number,
  ) {
    this.binanceService = binanceService;
    this.botId = botId;
    this.symbol = symbol;
    this.smaPeriod = smaPeriod;
    this.rsiPeriod = rsiPeriod;
    this.rsiOverbought = rsiOverbought;
    this.rsiOversold = rsiOversold;
  }

  async execute() {
    try {
      const klines = await this.binanceService.binance.candlesticks(
        this.symbol,
        '1h',
        `limit ${Math.max(this.smaPeriod, this.rsiPeriod) + 1}`,
      );
      const closePrices = klines.map((candle: Candle) =>
        Number.parseFloat(candle[4]),
      );

      const sma = Indicators.calculateSma(closePrices, this.smaPeriod);
      const rsi = Indicators.calculateRsi(closePrices, this.rsiPeriod);
      const currentPrice = closePrices[closePrices.length - 1];

      let signal: 'BUY' | 'SELL' | null = null;

      if (currentPrice > sma && rsi < this.rsiOversold) {
        signal = 'BUY';
        logger.info(
          `🚀 Sinal de compra para ${this.symbol}: Preço acima da SMA e RSI sobrevendido`,
        );
      } else if (currentPrice < sma && rsi > this.rsiOverbought) {
        signal = 'SELL';
        logger.info(
          `🔻 Sinal de venda para ${this.symbol}: Preço abaixo da SMA e RSI sobrecomprado`,
        );
      } else {
        logger.info(`➖ Sem sinal claro para ${this.symbol}`);
      }

      if (signal) {
        await this.createSignal(signal, currentPrice);
      }
    } catch (error) {
      logger.error(
        `❌ Erro ao executar estratégia para ${this.symbol}: ${error}`,
      );
    }
  }

  private async createSignal(type: 'BUY' | 'SELL', price: number) {
    try {
      const signal = await prisma.tradingSignal.create({
        data: {
          botId: this.botId,
          symbol: this.symbol,
          type,
          price,
        },
      });
      logger.info(`✅ Sinal de trading criado: ${signal.id}`);
    } catch (error) {
      logger.error(`❌ Erro ao criar sinal de trading: ${error}`);
    }
  }
}
