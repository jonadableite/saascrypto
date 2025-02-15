// src/services/bot.service.ts
import { type Bot, PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import type { BotConfig } from '../types/bot.types';
import { BinanceService } from './binance.service';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { SmaRsiStrategy } from './strategy/sma-rsi.strategy';
import { SimpleMovingAverageCrossover } from './strategy/strategy.service';

const prisma = new PrismaClient();
const redisService = new RedisService();
const emailService = new EmailService();

interface StrategyResult {
  signal: 'COMPRAR' | 'VENDER' | null;
  asset: string;
  price: number;
  reason?: string;
}

function isBotConfig(config: unknown): config is BotConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.symbol === 'string' &&
    (c.strategyType === 'SMA_CROSSOVER' || c.strategyType === 'SMA_RSI')
  );
}

export class BotService {
  private binanceService: BinanceService;
  private runningBots: Map<string, NodeJS.Timeout> = new Map();

  constructor(apiKey: string, apiSecret: string) {
    this.binanceService = new BinanceService(apiKey, apiSecret);
  }

  async startBot(botId: string) {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('👁‍🗨 Bot não encontrado');
      }

      if (!isBotConfig(bot.config)) {
        throw new Error('Configuração do bot inválida');
      }

      const config = bot.config as BotConfig;
      const { symbol, strategyType } = config;

      const strategy = this.createStrategy(botId, config);

      const intervalId = setInterval(async () => {
        await this.executeStrategy(botId, strategy, symbol);
      }, 60 * 1000); // Executar a cada minuto

      this.runningBots.set(botId, intervalId);

      await prisma.bot.update({
        where: { id: botId },
        data: { active: true },
      });

      await redisService.del(`bot:${botId}`); // Invalidar cache

      logger.info(`✅ Bot iniciado: ${botId}`);
    } catch (error) {
      logger.error(`❌ Erro ao iniciar bot ${botId}:`, error);
      throw error;
    }
  }

  async stopBot(botId: string) {
    try {
      const intervalId = this.runningBots.get(botId);
      if (intervalId) {
        clearInterval(intervalId);
        this.runningBots.delete(botId);
      }

      await prisma.bot.update({
        where: { id: botId },
        data: { active: false },
      });

      await redisService.del(`bot:${botId}`); // Invalidar cache

      logger.info(`🔴 Bot parado: ${botId}`);
    } catch (error) {
      logger.error(`📛 Erro ao parar bot ${botId}:`, error);
      throw error;
    }
  }

  async getSignals(botId: string, limit = 10) {
    try {
      const cacheKey = `signals:${botId}:${limit}`;
      const cachedSignals = await redisService.get(cacheKey);

      if (cachedSignals) {
        return JSON.parse(cachedSignals);
      }

      const signals = await prisma.tradingSignal.findMany({
        where: { botId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      await redisService.set(cacheKey, JSON.stringify(signals), 300); // Cache por 5 minutos

      return signals;
    } catch (error) {
      logger.error(`⛔️ Erro ao obter sinais para o bot ${botId}:`, error);
      throw error;
    }
  }

  private async executeStrategy(botId: string, strategy: any, symbol: string) {
    try {
      const result = await strategy.execute();
      if (result.signal) {
        await this.saveSignal(botId, result);
        await this.notifyUser(botId, result);
        logger.info(
          `💹 Sinal gerado para ${symbol}: ${result.signal} a ${result.price}`,
        );
      } else {
        logger.info(`👀 Monitorando ${symbol} - Nenhum sinal gerado`);
      }
    } catch (error) {
      logger.error(`❌ Erro ao executar estratégia para ${botId}:`, error);
    }
  }

  private async saveSignal(botId: string, result: StrategyResult) {
    try {
      await prisma.tradingSignal.create({
        data: {
          botId,
          symbol: result.asset,
          type: result.signal,
          price: result.price,
          reason: result.reason,
        },
      });
    } catch (error) {
      logger.error(`❌ Erro ao salvar sinal para ${result.asset}:`, error);
    }
  }

  private async notifyUser(botId: string, result: StrategyResult) {
    try {
      const bot = await this.getBot(botId);
      if (bot && bot.userId) {
        const user = await prisma.user.findUnique({
          where: { id: bot.userId },
        });
        if (user?.email) {
          await emailService.sendEmail(
            user.email,
            `Novo sinal de trading para ${result.asset}`,
            `Um novo sinal de ${result.signal} foi gerado para ${result.asset} a ${result.price}. Razão: ${result.reason || 'Não especificada'}.`,
          );
          logger.info(`📧 Notificação enviada para ${user.email}`);
        }
      }
    } catch (error) {
      logger.error(
        `❌ Erro ao notificar usuário sobre sinal para ${result.asset}:`,
        error,
      );
    }
  }

  private createStrategy(botId: string, config: BotConfig) {
    if (config.strategyType === 'SMA_CROSSOVER') {
      return new SimpleMovingAverageCrossover(
        this.binanceService,
        botId,
        config.symbol,
        config.shortPeriod,
        config.longPeriod,
      );
    } else if (config.strategyType === 'SMA_RSI') {
      return new SmaRsiStrategy(
        this.binanceService,
        botId,
        config.symbol,
        config.smaPeriod,
        config.rsiPeriod,
        config.rsiOverbought,
        config.rsiOversold,
      );
    }
    throw new Error('Estratégia não suportada');
  }

  private async getBot(botId: string): Promise<Bot | null> {
    const cachedBot = await redisService.get(`bot:${botId}`);
    if (cachedBot) {
      return JSON.parse(cachedBot);
    }
    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (bot) {
      await redisService.set(`bot:${botId}`, JSON.stringify(bot), 3600);
    }
    return bot;
  }
}
