// src/controllers/bot.controller.ts

import { type Prisma, PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { logger } from '../config/logger';
import { BacktestingService } from '../services/backtesting.service';
import { BotService } from '../services/bot.service';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const configService = ConfigService.getInstance();

const handleApiError = (res: Response, error: unknown, message: string) => {
  logger.error(`❌ ${message}:`, error);
  res.status(500).json({ message });
};

const getBinanceCredentials = () => {
  const apiKey = configService.getBinanceApiKey();
  const apiSecret = configService.getBinanceApiSecret();

  if (!apiKey || !apiSecret) {
    throw new Error('🔐 Chaves da API Binance não configuradas');
  }

  return { apiKey, apiSecret };
};

export const createBot = async (req: Request, res: Response) => {
  try {
    const { name, description, strategyId, config } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: '📛 Usuário não autenticado' });
    }

    // Verificar se a estratégia existe
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return res.status(400).json({ message: '📛 Estratégia não encontrada' });
    }

    const bot = await prisma.bot.create({
      data: {
        name,
        description,
        userId,
        strategyId,
        config: config as Prisma.JsonObject,
        active: false, // Definindo como falso por padrão
      },
    });

    logger.info(`✅ Bot criado: ${bot.name}`);
    res.status(201).json(bot);
  } catch (error) {
    handleApiError(res, error, '📛 Erro ao criar bot');
  }
};

export const getAllBots = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const bots = await prisma.bot.findMany({ where: { userId } });
    res.json(bots);
  } catch (error) {
    handleApiError(res, error, 'Erro ao buscar bots');
  }
};

export const getBot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const bot = await prisma.bot.findFirst({ where: { id, userId } });

    if (!bot) {
      return res.status(404).json({ message: 'Bot não encontrado' });
    }

    res.json(bot);
  } catch (error) {
    handleApiError(res, error, 'Erro ao buscar bot');
  }
};

export const updateBot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, description, active, config } = req.body;

    const bot = await prisma.bot.updateMany({
      where: { id, userId },
      data: { name, description, active, config },
    });

    if (bot.count === 0) {
      return res.status(404).json({ message: 'Bot não encontrado' });
    }

    logger.info(`✅ Bot atualizado: ${id}`);
    res.json({ message: 'Bot atualizado com sucesso' });
  } catch (error) {
    handleApiError(res, error, 'Erro ao atualizar bot');
  }
};

export const deleteBot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const bot = await prisma.bot.deleteMany({ where: { id, userId } });

    if (bot.count === 0) {
      return res.status(404).json({ message: 'Bot não encontrado' });
    }

    logger.info(`✅ Bot deletado: ${id}`);
    res.json({ message: 'Bot deletado com sucesso' });
  } catch (error) {
    handleApiError(res, error, 'Erro ao deletar bot');
  }
};

export const startBot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const bot = await prisma.bot.findFirst({ where: { id, userId } });
    if (!bot) {
      return res.status(404).json({ message: '👁‍🗨 Bot não encontrado' });
    }

    const { apiKey, apiSecret } = getBinanceCredentials();

    const botService = new BotService(apiKey, apiSecret);
    await botService.startBot(id);
    res.status(200).json({ message: '🟢 Bot iniciado com sucesso' });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Chaves da API Binance não configuradas'
    ) {
      return res.status(503).json({ message: error.message });
    }
    handleApiError(res, error, 'Erro ao iniciar bot');
  }
};

export const stopBot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const bot = await prisma.bot.findFirst({ where: { id, userId } });
    if (!bot) {
      return res.status(404).json({ message: 'Bot não encontrado' });
    }

    const { apiKey, apiSecret } = getBinanceCredentials();

    const botService = new BotService(apiKey, apiSecret);
    await botService.stopBot(id);
    res.status(200).json({ message: '👁‍🗨 Bot parado com sucesso' });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Chaves da API Binance não configuradas'
    ) {
      return res.status(503).json({ message: error.message });
    }
    handleApiError(res, error, 'Erro ao parar bot');
  }
};

export const getSignals = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    const userId = req.userId;

    const bot = await prisma.bot.findFirst({ where: { id, userId } });
    if (!bot) {
      return res.status(404).json({ message: '👁‍🗨 Bot não encontrado' });
    }

    const { apiKey, apiSecret } = getBinanceCredentials();

    const botService = new BotService(apiKey, apiSecret);
    const signals = await botService.getSignals(id, Number(limit) || 10);
    res.status(200).json(signals);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Chaves da API Binance não configuradas'
    ) {
      return res.status(503).json({ message: error.message });
    }
    handleApiError(res, error, 'Erro ao obter sinais');
  }
};

export const runBacktest = async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      startTime,
      endTime,
      interval,
      smaPeriod,
      rsiPeriod,
      rsiOverbought,
      rsiOversold,
    } = req.body;

    const { apiKey, apiSecret } = getBinanceCredentials();

    const backtestingService = new BacktestingService(apiKey, apiSecret);

    const result = await backtestingService.runBacktest(
      symbol,
      startTime,
      endTime,
      interval,
      {
        smaPeriod,
        rsiPeriod,
        rsiOverbought,
        rsiOversold,
      },
    );

    res.json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Chaves da API Binance não configuradas'
    ) {
      return res.status(503).json({ message: error.message });
    }
    handleApiError(res, error, 'Erro ao executar backtesting');
  }
};

export const setBinanceApiCredentials = async (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret } = req.body;

    if (!apiKey || !apiSecret) {
      return res
        .status(400)
        .json({ message: 'API Key e Secret são obrigatórios' });
    }

    configService.setBinanceApiKey(apiKey);
    configService.setBinanceApiSecret(apiSecret);

    res
      .status(200)
      .json({ message: 'Credenciais da API Binance atualizadas com sucesso' });
  } catch (error) {
    handleApiError(res, error, 'Erro ao atualizar credenciais da API Binance');
  }
};
