// src/services/config.service.ts
import { logger } from '../config/logger';

export class ConfigService {
  private static instance: ConfigService;
  private binanceApiKey: string | undefined;
  private binanceApiSecret: string | undefined;

  private constructor() {
    this.binanceApiKey = process.env.BINANCE_API_KEY;
    this.binanceApiSecret = process.env.BINANCE_API_SECRET;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getBinanceApiKey(): string | undefined {
    return this.binanceApiKey;
  }

  public getBinanceApiSecret(): string | undefined {
    return this.binanceApiSecret;
  }

  public setBinanceApiKey(key: string): void {
    this.binanceApiKey = key;
    logger.info('Binance API Key atualizada');
  }

  public setBinanceApiSecret(secret: string): void {
    this.binanceApiSecret = secret;
    logger.info('Binance API Secret atualizada');
  }

  public hasBinanceApiCredentials(): boolean {
    return !!this.binanceApiKey && !!this.binanceApiSecret;
  }
}
