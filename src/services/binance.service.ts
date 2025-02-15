// src/services/binance.service.ts

import axios from 'axios';
import Binance from 'node-binance-api';
import { logger } from '../config/logger';

type Candle = [number, string, string, string, string, string, string, string];

export class BinanceService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private binance: Binance;

  constructor() {
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error(
        'As chaves da API Binance não estão configuradas corretamente.',
      );
    }

    this.binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      useServerTime: true,
      recvWindow: 60000,
    });
  }

  async obterPrecoAtual(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/ticker/price`, {
        params: { symbol },
      });
      const preco = Number(response.data.price);
      logger.info(`💰 Preço atual obtido para ${symbol}: ${preco}`);
      return preco;
    } catch (error) {
      logger.error(`❌ Erro ao obter preço atual para ${symbol}:`, error);
      throw error;
    }
  }

  async obterDadosHistoricos(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    try {
      const klines = await this.binance.candlesticks(symbol, interval, {
        startTime,
        endTime,
      });
      logger.info(`📊 Dados históricos obtidos para ${symbol}`);
      return klines as Candle[];
    } catch (error) {
      logger.error(`❌ Erro ao obter dados históricos para ${symbol}:`, error);
      throw error;
    }
  }

  async obterInfoConta() {
    try {
      const info = await this.binance.balance();
      logger.info('✅ Informações da conta Binance obtidas com sucesso');
      return info;
    } catch (error) {
      logger.error(`❌ Erro ao obter informações da conta Binance:`, error);
      throw error;
    }
  }

  async obterVelasRecentes(
    simbolo: string,
    intervalo: string,
    limite: number,
  ): Promise<Candle[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/klines`, {
        params: { symbol: simbolo, interval: intervalo, limit: limite },
      });
      logger.info(`🕯️ Velas recentes obtidas para ${simbolo}`);
      return response.data;
    } catch (error) {
      logger.error(`❌ Erro ao obter velas recentes para ${simbolo}:`, error);
      throw error;
    }
  }

  async colocarOrdem(
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
      logger.error(`❌ Erro ao colocar ordem:`, error);
      throw error;
    }
  }

  async obterOrdensAbertas(symbol: string) {
    try {
      const orders = await this.binance.openOrders(symbol);
      logger.info(`📋 Ordens abertas obtidas para ${symbol}`);
      return orders;
    } catch (error) {
      logger.error(`❌ Erro ao obter ordens abertas para ${symbol}:`, error);
      throw error;
    }
  }

  async cancelarOrdem(symbol: string, orderId: number) {
    try {
      const result = await this.binance.cancel(symbol, orderId);
      logger.info(`❌ Ordem cancelada: ${orderId} para ${symbol}`);
      return result;
    } catch (error) {
      logger.error(
        `❌ Erro ao cancelar ordem ${orderId} para ${symbol}:`,
        error,
      );
      throw error;
    }
  }

  async obterLivroDeOrdens(symbol: string, limit = 100) {
    try {
      const orderBook = await this.binance.depth(symbol, limit);
      logger.info(`📚 Livro de ordens obtido para ${symbol}`);
      return orderBook;
    } catch (error) {
      logger.error(`❌ Erro ao obter livro de ordens para ${symbol}:`, error);
      throw error;
    }
  }

  async obterTrades(symbol: string, limit = 500) {
    try {
      const trades = await this.binance.trades(symbol, limit);
      logger.info(`🔄 Trades recentes obtidos para ${symbol}`);
      return trades;
    } catch (error) {
      logger.error(`❌ Erro ao obter trades recentes para ${symbol}:`, error);
      throw error;
    }
  }
}
