// src/scripts/createDefaultStrategies.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultStrategies() {
  try {
    const strategies = [
      {
        name: 'SMA Crossover',
        description: 'Simple Moving Average Crossover Strategy',
        type: 'TREND_FOLLOWING',
        config: {
          shortPeriod: 10,
          longPeriod: 20,
        },
        indicators: [
          { type: 'SMA', period: 10 },
          { type: 'SMA', period: 20 },
        ],
        entryRules: [{ condition: 'SMA_10 > SMA_20' }],
        exitRules: [{ condition: 'SMA_10 < SMA_20' }],
        riskRules: [{ type: 'STOP_LOSS', value: 2 }],
      },
      // Adicione mais estratégias padrão aqui
    ];

    for (const strategy of strategies) {
      await prisma.strategy.create({
        data: {
          name: strategy.name,
          description: strategy.description,
          type: strategy.type,
          config: strategy.config as any,
          indicators: strategy.indicators as any,
          entryRules: strategy.entryRules as any,
          exitRules: strategy.exitRules as any,
          riskRules: strategy.riskRules as any,
        },
      });
      console.log(`Estratégia criada: ${strategy.name}`);
    }

    console.log('Estratégias padrão criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar estratégias padrão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultStrategies();
