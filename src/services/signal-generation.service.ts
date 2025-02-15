// src/services/geracao-sinais.service.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { Indicators } from '../services/indicators/indicators.service';
import type { BinanceService } from './binance.service';

const prisma = new PrismaClient();

export class ServicoGeracaoSinais {
  constructor(private servicoBinance: BinanceService) {}

  async gerarSinais(
    botId: string,
    simbolo: string,
    estrategia: 'CRUZAMENTO_MMS' | 'IFR',
  ): Promise<'COMPRAR' | 'VENDER' | null> {
    try {
      const velas = await this.servicoBinance.obterVelasRecentes(
        simbolo,
        '1h',
        100,
      );
      const precosDeFechar = velas.map((vela: any[]) =>
        Number.parseFloat(vela[4]),
      );

      let sinal: 'COMPRAR' | 'VENDER' | null = null;

      if (estrategia === 'CRUZAMENTO_MMS') {
        sinal = this.gerarSinalCruzamentoMms(precosDeFechar);
      } else if (estrategia === 'IFR') {
        sinal = this.gerarSinalIfr(precosDeFechar);
      }

      if (sinal) {
        await this.salvarSinal(
          botId,
          simbolo,
          sinal,
          precosDeFechar[precosDeFechar.length - 1],
        );
      }

      return sinal;
    } catch (erro) {
      logger.error(`❌ Erro ao gerar sinais para ${simbolo}:`, erro);
      throw erro;
    }
  }

  private gerarSinalCruzamentoMms(
    precos: number[],
  ): 'COMPRAR' | 'VENDER' | null {
    const mmsCurta = Indicators.calculateSma(precos, 10);
    const mmsLonga = Indicators.calculateSma(precos, 20);

    if (mmsCurta > mmsLonga) {
      return 'COMPRAR';
    }
    if (mmsCurta < mmsLonga) {
      return 'VENDER';
    }

    return null;
  }

  private gerarSinalIfr(precos: number[]): 'COMPRAR' | 'VENDER' | null {
    const ifr = Indicators.calculateRsi(precos, 14);

    if (ifr < 30) {
      return 'COMPRAR';
    }
    if (ifr > 70) {
      return 'VENDER';
    }

    return null;
  }

  private async salvarSinal(
    botId: string,
    simbolo: string,
    tipo: 'COMPRAR' | 'VENDER',
    preco: number,
  ) {
    await prisma.tradingSignal.create({
      data: {
        botId,
        symbol: simbolo,
        type: tipo,
        price: preco,
      },
    });
    logger.info(`✅ Sinal de ${tipo} salvo para ${simbolo} a ${preco}`);
  }
}
