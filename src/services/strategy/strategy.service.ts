import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';
import type { BinanceService } from '../binance.service';

const prisma = new PrismaClient();

export class SimpleMovingAverageCrossover {
  private binanceService: BinanceService;
  private symbol: string;
  private shortPeriod: number;
  private longPeriod: number;
  private botId: string;

  constructor(
    binanceService: BinanceService,
    botId: string,
    symbol: string,
    shortPeriod: number,
    longPeriod: number,
  ) {
    this.binanceService = binanceService;
    this.botId = botId;
    this.symbol = symbol;
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
  }

  async execute() {
    try {
      const klines = await this.binanceService.binance.candlesticks(
        this.symbol,
        '1h',
        `limit ${this.longPeriod}`,
      );
      const closePrices = klines.map((candle) => Number.parseFloat(candle[4]));

      const shortSma = this.calculateSMA(closePrices, this.shortPeriod);
      const longSma = this.calculateSMA(closePrices, this.longPeriod);
      const currentPrice = closePrices[closePrices.length - 1];

      let signalType: 'COMPRAR' | 'VENDER' | null = null;

      if (shortSma > longSma) {
        signalType = 'COMPRAR';
        logger.info(`🚀 Sinal de compra para ${this.symbol}`);
      } else if (shortSma < longSma) {
        signalType = 'VENDER';
        logger.info(`🔻 Sinal de venda para ${this.symbol}`);
      } else {
        logger.info(`➖ Sem sinal claro para ${this.symbol}`);
      }

      if (signalType) {
        await this.createSignal(signalType, currentPrice);
      }
    } catch (error) {
      logger.error(
        `❌ Erro ao executar estratégia para ${this.symbol}: ${error}`,
      );
    }
  }

  private calculateSMA(prices: number[], period: number): number {
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private async createSignal(type: 'COMPRAR' | 'VENDER', price: number) {
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
