// src/services/strategy/strategy-analyzer.service.ts

import type { Strategy } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../../config/logger';
import type { BinanceService } from '../binance.service';
import type { ServicoGeracaoSinais } from '../signal-generation.service';

export class StrategyAnalyzerService {
  constructor(
    private binanceService: BinanceService,
    private servicoGeracaoSinais: ServicoGeracaoSinais,
  ) {}

  async testarEstrategia(
    estrategia: Strategy,
    simbolo: string,
  ): Promise<boolean> {
    const resultados = await this.analisarEficienciaEstrategia(
      estrategia,
      simbolo,
    );
    const taxaAcerto = resultados.taxaAcerto;
    const resultadoFinanceiro = resultados.resultadoFinanceiro;

    logger.info(`📊 Análise da estratégia para ${simbolo}:`);
    logger.info(`   Taxa de acerto: ${taxaAcerto.toFixed(2)}%`);
    logger.info(`   Resultado financeiro: ${resultadoFinanceiro.toFixed(2)}%`);

    return taxaAcerto > 70 && resultadoFinanceiro > 0;
  }

  private async analisarEficienciaEstrategia(
    estrategia: Strategy,
    simbolo: string,
    dias = 30,
  ): Promise<{ taxaAcerto: number; resultadoFinanceiro: number }> {
    const velas = await this.binanceService.obterVelasRecentes(
      simbolo,
      '1h',
      dias * 24,
    );
    let acertos = 0;
    let totalSinais = 0;
    let resultadoAcumulado = 0;

    const previsoes = await this.fazerPrevisoes(velas);

    for (let i = 100; i < velas.length - 24; i++) {
      const velasAnteriores = velas.slice(0, i);
      const sinal = await this.servicoGeracaoSinais.gerarSinais(
        'test',
        simbolo,
        estrategia,
      );

      if (sinal.signal) {
        totalSinais++;
        const precoAtual = Number(velas[i][4]);
        const precoFuturo = Number(velas[i + 24][4]); // 24 horas depois
        const previsao = previsoes[i];

        if (
          (sinal.signal === 'COMPRAR' && precoFuturo > precoAtual) ||
          (sinal.signal === 'VENDER' && precoFuturo < precoAtual)
        ) {
          acertos++;
        }

        const variacao = ((precoFuturo - precoAtual) / precoAtual) * 100;
        resultadoAcumulado += sinal.signal === 'COMPRAR' ? variacao : -variacao;

        // Usar a previsão da IA para ajustar o sinal
        if (
          (previsao > 0.5 && sinal.signal === 'COMPRAR') ||
          (previsao < 0.5 && sinal.signal === 'VENDER')
        ) {
          acertos += 0.5; // Adiciona meio ponto se a IA concordar com o sinal
        }
      }
    }

    const taxaAcerto = totalSinais > 0 ? (acertos / totalSinais) * 100 : 0;
    return { taxaAcerto, resultadoFinanceiro: resultadoAcumulado };
  }

  private async fazerPrevisoes(velas: any[]): Promise<number[]> {
    // Preparar dados para o modelo
    const dados = velas.map((vela) => [
      Number(vela[1]), // Abertura
      Number(vela[2]), // Máxima
      Number(vela[3]), // Mínima
      Number(vela[4]), // Fechamento
      Number(vela[5]), // Volume
    ]);

    // Normalizar dados
    const dadosNormalizados = this.normalizarDados(dados);

    // Criar sequências
    const sequencias = [];
    const tamanhoSequencia = 24; // 24 horas de dados
    for (let i = tamanhoSequencia; i < dadosNormalizados.length; i++) {
      sequencias.push(dadosNormalizados.slice(i - tamanhoSequencia, i));
    }

    // Criar e treinar o modelo
    const modelo = this.criarModelo();
    await this.treinarModelo(modelo, sequencias);

    // Fazer previsões
    return tf.tidy(() => {
      const previsoes = modelo.predict(tf.tensor3d(sequencias)) as tf.Tensor;
      return Array.from(previsoes.dataSync());
    });
  }

  private normalizarDados(dados: number[][]): number[][] {
    const transposto = dados[0].map((_, colIndex) =>
      dados.map((row) => row[colIndex]),
    );
    const min = transposto.map((col) => Math.min(...col));
    const max = transposto.map((col) => Math.max(...col));

    return dados.map((row) =>
      row.map((val, i) => (val - min[i]) / (max[i] - min[i])),
    );
  }

  private criarModelo(): tf.LayersModel {
    const modelo = tf.sequential();
    modelo.add(
      tf.layers.lstm({ units: 50, inputShape: [24, 5], returnSequences: true }),
    );
    modelo.add(tf.layers.lstm({ units: 50 }));
    modelo.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    modelo.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
    return modelo;
  }

  private async treinarModelo(
    modelo: tf.LayersModel,
    sequencias: number[][][],
  ): Promise<void> {
    const xs = tf.tensor3d(sequencias.slice(0, -1));
    const ys = tf.tensor2d(
      sequencias.slice(1).map((seq) => [seq[seq.length - 1][3]]),
    ); // Usando o preço de fechamento como alvo

    await modelo.fit(xs, ys, {
      epochs: 10,
      batchSize: 32,
      shuffle: true,
      validationSplit: 0.1,
    });
  }
}
