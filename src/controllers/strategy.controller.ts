// src/controllers/strategy.controller.ts

import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export const listStrategies = async (req: Request, res: Response) => {
  try {
    const strategies = await prisma.strategy.findMany();
    logger.info(`📊 ${strategies.length} estratégias encontradas`);
    res.json(strategies);
  } catch (error) {
    logger.error('❌ Erro ao listar estratégias:', error);
    res.status(500).json({ message: 'Erro ao listar estratégias' });
  }
};

export const getStrategyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      logger.warn(`⚠️ Estratégia não encontrada: ${id}`);
      return res.status(404).json({ message: 'Estratégia não encontrada' });
    }

    logger.info(`📈 Estratégia encontrada: ${strategy.name}`);
    res.json(strategy);
  } catch (error) {
    logger.error(`❌ Erro ao buscar estratégia:`, error);
    res.status(500).json({ message: 'Erro ao buscar estratégia' });
  }
};
