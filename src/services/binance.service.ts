// src/services/binance.service.ts

import Binance from 'node-binance-api';
import { logger } from '../config/logger';

type Candle = [number, string, string, string, string, string, string, string];

export class BinanceService {
  binance: Binance;

  constructor(apiKey: string, apiSecret: string) {
    this.binance = new Binance().options({
      apiKey,
      apiSecret,
      useServerTime: true,
      recvWindow: 60000,
    });
  }

  async getHistoricalKlines(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    try {
      const klines = await this.binance.candlesticks(symbol, interval, {
        startTime: startTime,
        endTime: endTime,
      });
      logger.info(`💱 Dados históricos obtidos para ${symbol}`);
      return klines as Candle[];
    } catch (error) {
      logger.error(`❌ Erro ao obter dados históricos para ${symbol}:`, error);
      throw error;
    }
  }

  async getAccountInfo() {
    try {
      const info = await this.binance.balance();
      logger.info('✅ Informações da conta Binance obtidas com sucesso');
      return info;
    } catch (error) {
      logger.error(`❌ Erro ao obter informações da conta Binance: ${error}`);
      throw error;
    }
  }

  async obterVelasRecentes(
    simbolo: string,
    intervalo: string,
    limite: number,
  ): Promise<any[]> {
    try {
      const velas = await this.binance.candlesticks(simbolo, intervalo, {
        limit: limite,
      });
      logger.info(`✅ Velas recentes obtidas para ${simbolo}`);
      return velas;
    } catch (error) {
      logger.error(`❌ Erro ao obter velas recentes para ${simbolo}: ${error}`);
      throw error;
    }
  }

  async getPrice(symbol: string) {
    try {
      const price = await this.binance.prices(symbol);
      logger.info(`✅ Preço obtido para ${symbol}: ${price[symbol]}`);
      return price[symbol];
    } catch (error) {
      logger.error(`❌ Erro ao obter preço para ${symbol}: ${error}`);
      throw error;
    }
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
  ) {
    try {
      const order = await this.binance.order(side, symbol, quantity, price);
      logger.info(
        `✅ Ordem colocada: ${side} ${quantity} ${symbol} @ ${price}`,
      );
      return order;
    } catch (error) {
      logger.error(`❌ Erro ao colocar ordem: ${error}`);
      throw error;
    }
  }

  async getOpenOrders(symbol: string) {
    try {
      const orders = await this.binance.openOrders(symbol);
      logger.info(`✅ Ordens abertas obtidas para ${symbol}`);
      return orders;
    } catch (error) {
      logger.error(`❌ Erro ao obter ordens abertas para ${symbol}: ${error}`);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: number) {
    try {
      const result = await this.binance.cancel(symbol, orderId);
      logger.info(`✅ Ordem cancelada: ${orderId} para ${symbol}`);
      return result;
    } catch (error) {
      logger.error(
        `❌ Erro ao cancelar ordem ${orderId} para ${symbol}: ${error}`,
      );
      throw error;
    }
  }
}
