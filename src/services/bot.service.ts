// src/services/bot.service.ts

import { type Bot, PrismaClient, type Strategy } from '@prisma/client';
import { logger } from '../config/logger';
import { generateEmailTemplate } from '../templates/emailTemplate';
import { generateWhatsAppMessage } from '../templates/whatsappTemplate';
import type { BotConfig } from '../types/bot.types';
import { BinanceService } from './binance.service';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { ServicoGeracaoSinais } from './signal-generation.service';
import { StrategyAnalyzerService } from './strategy/strategy-analyzer.service';
import { WhatsAppService } from './whatsapp.service';

const prisma = new PrismaClient();
const redisService = new RedisService();
const emailService = new EmailService();
const whatsAppService = new WhatsAppService();

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const CANDLE_CACHE_TIME = 15 * 60; // 15 minutos em segundos

interface StrategyResult {
  signal: 'COMPRAR' | 'VENDER' | null;
  asset: string;
  price: number;
  reason: string;
  strength: 'FORTE' | 'MÉDIO' | 'FRACO';
}

export class BotService {
  private binanceService: BinanceService;
  private servicoGeracaoSinais: ServicoGeracaoSinais;
  private strategyAnalyzer: StrategyAnalyzerService;
  private runningBots: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.binanceService = new BinanceService();
    this.servicoGeracaoSinais = new ServicoGeracaoSinais(this.binanceService);
    this.strategyAnalyzer = new StrategyAnalyzerService(
      this.binanceService,
      this.servicoGeracaoSinais,
    );
  }

  async startBot(botId: string): Promise<void> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('👁‍🗨 Bot não encontrado');
      }

      if (!this.isBotConfig(bot.config)) {
        throw new Error('Configuração do bot inválida');
      }

      const strategy = await this.getStrategy(bot.strategyId);
      if (!strategy) {
        throw new Error('Estratégia não encontrada');
      }

      // Testar a estratégia antes de iniciar o bot
      const estrategiaEficiente = await this.strategyAnalyzer.testarEstrategia(
        strategy,
        bot.config.symbol,
      );
      if (!estrategiaEficiente) {
        logger.warn(
          `⚠️ A estratégia não atingiu a eficiência mínima para ${bot.config.symbol}. O bot não será iniciado.`,
        );
        return;
      }

      const intervalId = setInterval(
        () => this.executeStrategy(botId, bot.config, strategy),
        CHECK_INTERVAL,
      );
      this.runningBots.set(botId, intervalId);

      await prisma.bot.update({
        where: { id: botId },
        data: {
          active: true,
          config: { ...bot.config, intervalId: intervalId.toString() },
        },
      });

      logger.info(`✅ Bot iniciado: ${botId}`);
    } catch (error) {
      logger.error(`❌ Erro ao iniciar bot ${botId}:`, error);
      throw error;
    }
  }

  async stopBot(botId: string): Promise<void> {
    try {
      const intervalId = this.runningBots.get(botId);
      if (intervalId) {
        clearInterval(intervalId);
        this.runningBots.delete(botId);
      }

      await Promise.all([
        prisma.bot.update({ where: { id: botId }, data: { active: false } }),
        redisService.del(`bot:${botId}`),
      ]);

      logger.info(`🔴 Bot parado: ${botId}`);
    } catch (error) {
      logger.error(`📛 Erro ao parar bot ${botId}:`, error);
      throw error;
    }
  }

  async getSignals(botId: string, limit = 10): Promise<any[]> {
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

      await redisService.set(cacheKey, JSON.stringify(signals), 300);

      return signals;
    } catch (error) {
      logger.error(`⛔️ Erro ao obter sinais para o bot ${botId}:`, error);
      throw error;
    }
  }

  private async executeStrategy(
    botId: string,
    config: BotConfig,
    strategy: Strategy,
  ): Promise<void> {
    try {
      const candles = await this.getCachedCandles(
        config.symbol,
        config.interval,
      );
      const resultado = await this.servicoGeracaoSinais.gerarSinais(
        botId,
        config.symbol,
        strategy,
        candles,
      );

      if (resultado.signal && resultado.strength !== 'FRACO') {
        const price = candles[candles.length - 1][4]; // Preço de fechamento da última vela
        await this.processSignal(botId, {
          ...resultado,
          asset: config.symbol,
          price,
        });
      } else {
        logger.info(
          `👀 Monitorando ${config.symbol} - Nenhum sinal forte gerado`,
        );
      }
    } catch (error) {
      logger.error(`❌ Erro ao executar estratégia para ${botId}:`, error);
    }
  }

  private async getCachedCandles(
    symbol: string,
    interval: string,
  ): Promise<any[]> {
    const cacheKey = `candles:${symbol}:${interval}`;
    let candles = await redisService.get(cacheKey);

    if (!candles) {
      candles = await this.binanceService.obterVelasRecentes(
        symbol,
        interval,
        100,
      );
      await redisService.set(
        cacheKey,
        JSON.stringify(candles),
        CANDLE_CACHE_TIME,
      );
    } else {
      candles = JSON.parse(candles);
    }

    return candles;
  }

  private async processSignal(
    botId: string,
    result: StrategyResult,
  ): Promise<void> {
    await this.saveSignal(botId, result);
    if (result.strength === 'FORTE') {
      await this.notifyUser(botId, result);
    }
    logger.info(
      `💹 Sinal ${result.strength} gerado para ${result.asset}: ${result.signal} a ${result.price}`,
    );
  }

  private async saveSignal(
    botId: string,
    result: StrategyResult,
  ): Promise<void> {
    try {
      if (result.signal) {
        await prisma.tradingSignal.create({
          data: {
            botId,
            symbol: result.asset,
            type: result.signal,
            price: result.price,
            reason: result.reason,
            strength: result.strength,
          },
        });
        logger.info(
          `✅ Sinal ${result.strength} salvo com sucesso para ${result.asset}`,
        );
      }
    } catch (error) {
      logger.error(`❌ Erro ao salvar sinal para ${result.asset}:`, error);
    }
  }

  private async notifyUser(
    botId: string,
    result: StrategyResult,
  ): Promise<void> {
    try {
      const bot = await this.getBot(botId);
      if (bot?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: bot.userId },
        });
        if (user?.email && result.signal) {
          const emailContent = generateEmailTemplate(
            result.asset,
            result.signal,
            result.price,
            result.reason,
            result.strength,
          );
          await emailService.sendEmail(
            user.email,
            `🚨 Sinal FORTE de Trading: ${result.signal} ${result.asset}`,
            emailContent,
            true,
          );
          logger.info(
            `📧 Notificação de sinal FORTE enviada por email para ${user.email}`,
          );

          const whatsAppMessage = generateWhatsAppMessage(
            result.asset,
            result.signal,
            result.price,
            result.reason,
            result.strength,
          );
          await whatsAppService.sendMessage('5512992465180', whatsAppMessage);
          logger.info(`📱 Notificação de sinal FORTE enviada por WhatsApp`);
        }
      }
    } catch (error) {
      logger.error(
        `❌ Erro ao notificar usuário sobre sinal para ${result.asset}:`,
        error,
      );
    }
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

  private async getStrategy(strategyId: string): Promise<Strategy | null> {
    const cachedStrategy = await redisService.get(`strategy:${strategyId}`);
    if (cachedStrategy) {
      return JSON.parse(cachedStrategy);
    }
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });
    if (strategy) {
      await redisService.set(
        `strategy:${strategyId}`,
        JSON.stringify(strategy),
        3600,
      );
    }
    return strategy;
  }

  private isBotConfig(config: unknown): config is BotConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Partial<BotConfig>;

    return (
      typeof c.symbol === 'string' &&
      typeof c.interval === 'string' &&
      typeof c.longPeriod === 'number' &&
      typeof c.shortPeriod === 'number'
    );
  }
}
