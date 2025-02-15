// src/types/bot.types.ts
import type { Prisma } from '@prisma/client';

export type StrategyType = 'SMA_CROSSOVER' | 'SMA_RSI';

interface BaseConfig {
  symbol: string;
  strategyType: StrategyType;
  intervalId?: string | null;
}

interface SmaCrossoverConfig extends BaseConfig {
  strategyType: 'SMA_CROSSOVER';
  shortPeriod: number;
  longPeriod: number;
}

interface SmaRsiConfig extends BaseConfig {
  strategyType: 'SMA_RSI';
  smaPeriod: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
}

interface Bot {
  id: string;
  userId: string;
  config: BotConfig;
  active: boolean;
}

export type BotConfig = SmaCrossoverConfig | SmaRsiConfig;

export type BotConfigJson = Prisma.JsonObject & BotConfig;
