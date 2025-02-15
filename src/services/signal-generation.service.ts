// src/services/signal-generation.service.ts

import type { Strategy } from '@prisma/client';
import { logger } from '../config/logger';
import type { BinanceService } from './binance.service';
import * as Indicators from './indicators';

interface SignalResult {
  signal: 'COMPRAR' | 'VENDER' | null;
  reason: string;
  strength: 'FORTE' | 'MÉDIO' | 'FRACO';
}

interface IndicatorConfig {
  type: string;
  period: number;
  weight?: number;
}

interface Rule {
  condition: string;
}

const MARKET_INDEX = 'BTCUSDT';
const CORRELATION_PERIOD = 30;
const VOLUME_THRESHOLD = 1.5;
const ATR_THRESHOLD = 0.03;
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;

export class ServicoGeracaoSinais {
  constructor(private binanceService: BinanceService) {}

  async gerarSinais(
    botId: string,
    simbolo: string,
    estrategia: Strategy,
  ): Promise<SignalResult> {
    try {
      const velas = await this.binanceService.obterVelasRecentes(
        simbolo,
        '1h',
        100,
      );
      const precosDeFechar = velas.map((vela: any[]) => Number(vela[4]));
      const precosDeAbertura = velas.map((vela: any[]) => Number(vela[1]));
      const precosAltos = velas.map((vela: any[]) => Number(vela[2]));
      const precosBaixos = velas.map((vela: any[]) => Number(vela[3]));
      const volumes = velas.map((vela: any[]) => Number(vela[5]));

      const indicadores = this.calcularIndicadores(
        precosDeFechar,
        precosDeAbertura,
        precosAltos,
        precosBaixos,
        volumes,
        estrategia.indicators as IndicatorConfig[],
      );

      if (
        this.verificarCondicaoEntrada(
          indicadores,
          estrategia.entryRules as Rule[],
        )
      ) {
        const strength = await this.calcularForcaSinal(
          indicadores,
          'COMPRAR',
          simbolo,
        );
        if (strength !== 'FRACO') {
          logger.info(
            `🟢 Sinal de COMPRA (${strength}) gerado para ${simbolo} usando estratégia ${estrategia.name}`,
          );
          return {
            signal: 'COMPRAR',
            reason: `Sinal de compra gerado pela estratégia ${estrategia.name}`,
            strength,
          };
        }
      }

      if (
        this.verificarCondicaoSaida(indicadores, estrategia.exitRules as Rule[])
      ) {
        const strength = await this.calcularForcaSinal(
          indicadores,
          'VENDER',
          simbolo,
        );
        if (strength !== 'FRACO') {
          logger.info(
            `🔴 Sinal de VENDA (${strength}) gerado para ${simbolo} usando estratégia ${estrategia.name}`,
          );
          return {
            signal: 'VENDER',
            reason: `Sinal de venda gerado pela estratégia ${estrategia.name}`,
            strength,
          };
        }
      }

      logger.info(
        `⚪ Nenhum sinal forte gerado para ${simbolo} usando estratégia ${estrategia.name}`,
      );
      return {
        signal: null,
        reason: 'Nenhum sinal forte gerado',
        strength: 'FRACO',
      };
    } catch (erro) {
      logger.error(`❌ Erro ao gerar sinais para ${simbolo}:`, erro);
      throw new Error(`Falha ao gerar sinais: ${(erro as Error).message}`);
    }
  }

  private calcularIndicadores(
    precosDeFechar: number[],
    precosDeAbertura: number[],
    precosAltos: number[],
    precosBaixos: number[],
    volumes: number[],
    indicadoresConfig: IndicatorConfig[],
  ): Record<string, number> {
    const indicadores: Record<string, number> = {};
    for (const config of indicadoresConfig) {
      try {
        switch (config.type) {
          case 'SMA':
            indicadores[`SMA_${config.period}`] = Indicators.calculateSMA(
              precosDeFechar,
              config.period,
            );
            break;
          case 'EMA':
            indicadores[`EMA_${config.period}`] = Indicators.calculateEMA(
              precosDeFechar,
              config.period,
            );
            break;
          case 'RSI':
            indicadores['RSI'] = Indicators.calculateRSI(
              precosDeFechar,
              config.period,
            );
            break;
          case 'ATR':
            indicadores['ATR'] = Indicators.calculateATR(
              precosAltos,
              precosBaixos,
              precosDeFechar,
              config.period,
            );
            break;
          case 'VOLUME':
            indicadores['VOLUME'] = volumes[volumes.length - 1];
            indicadores['VOLUME_MEDIO'] = Indicators.calculateAverageVolume(
              volumes,
              config.period,
            );
            break;
          case 'MACD':
            const macdResult = Indicators.calculateMACD(
              precosDeFechar,
              12,
              26,
              9,
            );
            indicadores['MACD'] = macdResult.macd;
            indicadores['MACD_SIGNAL'] = macdResult.signal;
            break;
          case 'SUPORTE_RESISTENCIA':
            const supportResistance = Indicators.calculateSupportResistance(
              precosDeFechar,
              config.period,
            );
            indicadores['SUPORTE'] = supportResistance.support;
            indicadores['RESISTENCIA'] = supportResistance.resistance;
            break;
          case 'CORRELACAO_MERCADO':
            indicadores['CORRELACAO_MERCADO'] = Math.random() * 2 - 1;
            break;
          default:
            logger.warn(`⚠️ Tipo de indicador não suportado: ${config.type}`);
        }
      } catch (error) {
        logger.error(`❌ Erro ao calcular indicador ${config.type}:`, error);
      }
    }
    indicadores['PRECO_ATUAL'] = precosDeFechar[precosDeFechar.length - 1];
    return indicadores;
  }

  private verificarCondicaoEntrada(
    indicadores: Record<string, number>,
    regras: Rule[],
  ): boolean {
    return this.verificarCondicoes(indicadores, regras);
  }

  private verificarCondicaoSaida(
    indicadores: Record<string, number>,
    regras: Rule[],
  ): boolean {
    return this.verificarCondicoes(indicadores, regras);
  }

  private verificarCondicoes(
    indicadores: Record<string, number>,
    regras: Rule[],
  ): boolean {
    return regras.every((regra) =>
      this.avaliarCondicao(indicadores, regra.condition),
    );
  }

  private avaliarCondicao(
    indicadores: Record<string, number>,
    condicao: string,
  ): boolean {
    const condicaoSubstituida = this.substituirValoresIndicadores(
      condicao,
      indicadores,
    );

    try {
      const [indicador1, operador, indicador2] = condicaoSubstituida.split(' ');
      const valor1 = Number(indicador1);
      const valor2 = Number(indicador2);

      if (isNaN(valor1) || isNaN(valor2)) {
        logger.warn(`⚠️ Valores inválidos na condição: ${condicaoSubstituida}`);
        return false;
      }

      switch (operador) {
        case '>':
          return valor1 > valor2;
        case '<':
          return valor1 < valor2;
        case '>=':
          return valor1 >= valor2;
        case '<=':
          return valor1 <= valor2;
        case '==':
          return valor1 === valor2;
        default:
          logger.warn(`⚠️ Operador não suportado na condição: ${operador}`);
          return false;
      }
    } catch (error) {
      logger.error(
        `❌ Erro ao avaliar condição: ${condicaoSubstituida}`,
        error,
      );
      return false;
    }
  }

  private substituirValoresIndicadores(
    condicao: string,
    indicadores: Record<string, number>,
  ): string {
    return Object.entries(indicadores).reduce(
      (acc, [chave, valor]) =>
        acc.replace(new RegExp(chave, 'g'), valor.toString()),
      condicao,
    );
  }

  private async calcularForcaSinal(
    indicadores: Record<string, number>,
    tipo: 'COMPRAR' | 'VENDER',
    simbolo: string,
  ): Promise<'FORTE' | 'MÉDIO' | 'FRACO'> {
    let pontuacao = 0;
    const pesos = {
      tendencia: 2,
      rsi: 2,
      volatilidade: 1.5,
      volume: 1.5,
      momentum: 2,
      suporteResistencia: 2,
      correlacao: 1,
    };

    // 1. Análise de Tendência (usando EMA)
    const emaDiff = (indicadores['EMA_10'] || 0) - (indicadores['EMA_20'] || 0);
    const emaTendencia = tipo === 'COMPRAR' ? emaDiff > 0 : emaDiff < 0;
    pontuacao += emaTendencia ? pesos.tendencia : -pesos.tendencia;

    // 2. Força Relativa (RSI)
    const rsi = indicadores['RSI'] || 50;
    if (tipo === 'COMPRAR') {
      if (rsi < RSI_OVERSOLD) pontuacao += pesos.rsi * 1.5;
      else if (rsi < 45) pontuacao += pesos.rsi;
      else if (rsi > RSI_OVERBOUGHT) pontuacao -= pesos.rsi * 1.5;
    } else {
      if (rsi > RSI_OVERBOUGHT) pontuacao += pesos.rsi * 1.5;
      else if (rsi > 55) pontuacao += pesos.rsi;
      else if (rsi < RSI_OVERSOLD) pontuacao -= pesos.rsi * 1.5;
    }

    // 3. Volatilidade (ATR - Average True Range)
    const atr = indicadores['ATR'] || 0;
    const atrNormalizado = atr / (indicadores['PRECO_ATUAL'] || 1);
    if (atrNormalizado > ATR_THRESHOLD) {
      pontuacao +=
        tipo === 'COMPRAR' ? pesos.volatilidade : -pesos.volatilidade;
    }

    // 4. Volume
    const volumeAtual = indicadores['VOLUME'] || 0;
    const volumeMedio = indicadores['VOLUME_MEDIO'] || 1;
    if (volumeAtual > volumeMedio * VOLUME_THRESHOLD) {
      pontuacao += tipo === 'COMPRAR' ? pesos.volume : -pesos.volume;
    }

    // 5. Momentum (MACD)
    const macd = indicadores['MACD'] || 0;
    const macdSignal = indicadores['MACD_SIGNAL'] || 0;
    const macdCruzamento =
      tipo === 'COMPRAR' ? macd > macdSignal : macd < macdSignal;
    pontuacao += macdCruzamento ? pesos.momentum : -pesos.momentum;

    // 6. Suporte e Resistência
    const precoAtual = indicadores['PRECO_ATUAL'] || 0;
    const suporte = indicadores['SUPORTE'] || 0;
    const resistencia = indicadores['RESISTENCIA'] || Number.POSITIVE_INFINITY;
    if (tipo === 'COMPRAR' && precoAtual > resistencia)
      pontuacao += pesos.suporteResistencia;
    if (tipo === 'VENDER' && precoAtual < suporte)
      pontuacao += pesos.suporteResistencia;

    // 7. Correlação com mercado geral
    const correlacao = await this.calcularCorrelacaoMercado(simbolo);
    pontuacao += (Math.abs(correlacao) > 0.7 ? 1 : -1) * pesos.correlacao;

    // Normalizar a pontuação
    const pontuacaoMaxima = Object.values(pesos).reduce((a, b) => a + b, 0) * 2;
    const pontuacaoNormalizada =
      (pontuacao + pontuacaoMaxima) / (2 * pontuacaoMaxima);

    // Determinar a força do sinal com base na pontuação normalizada
    if (pontuacaoNormalizada > 0.7) return 'FORTE';
    if (pontuacaoNormalizada > 0.5) return 'MÉDIO';
    return 'FRACO';
  }

  private async calcularCorrelacaoMercado(simbolo: string): Promise<number> {
    const [precosSimbolo, precosIndice] = await Promise.all([
      this.obterPrecosDiarios(simbolo, CORRELATION_PERIOD),
      this.obterPrecosDiarios(MARKET_INDEX, CORRELATION_PERIOD),
    ]);

    const retornosSimbolo = this.calcularRetornos(precosSimbolo);
    const retornosIndice = this.calcularRetornos(precosIndice);

    return this.calcularCorrelacao(retornosSimbolo, retornosIndice);
  }

  private async obterPrecosDiarios(
    simbolo: string,
    dias: number,
  ): Promise<number[]> {
    // Implementar lógica para obter preços diários da Binance ou outra fonte
    return Array(dias)
      .fill(0)
      .map(() => Math.random() * 1000);
  }

  private calcularRetornos(precos: number[]): number[] {
    return precos.slice(1).map((preco, i) => (preco - precos[i]) / precos[i]);
  }

  private calcularCorrelacao(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    let sumX = 0,
      sumY = 0,
      sumXy = 0,
      sumX2 = 0,
      sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXy += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXy - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return numerator / denominator;
  }
}
