// src/config/redis.ts
import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl =
  process.env.REDIS_URL ||
  'redis://default:91238983Jonadab@painel.whatlead.com.br:6379';

const redisConfig = {
  lazyConnect: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

logger.info(`Configuração do Redis: ${redisUrl}`);

const redisClient = new Redis(redisUrl, redisConfig);

redisClient.on('error', (error) => {
  logger.error('❌ Erro no Redis:', error);
});

redisClient.on('connect', () => {
  logger.info('🔗 Conectado ao Redis com sucesso');
});

redisClient.on('ready', () => {
  logger.info('✅ Cliente Redis está pronto para uso');
});

redisClient.on('close', () => {
  logger.warn('🔌 Conexão com o Redis foi fechada');
});

redisClient.on('reconnecting', () => {
  logger.info('🔄 Tentando reconectar ao Redis...');
});

export default redisClient;
