import cors from 'cors';
import dotenv from 'dotenv';
// src/app.ts
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from './config/logger';
import redisClient from './config/redis';
import authRoutes from './routes/auth.routes';
import botRoutes from './routes/bot.routes';
import strategyRoutes from './routes/strategy.routes';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/strategies', strategyRoutes);

const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    // Tentativa de conexão com o Redis
    await redisClient.connect();
    logger.info('Redis conectado com sucesso');

    app.listen(PORT, () => {
      logger.info(`🤖 Servidor iniciado na porta ${PORT} 🌐`);
    });
  } catch (error) {
    logger.error('Falha ao iniciar o servidor:', error);
    if (error instanceof Error) {
      logger.error('Detalhes do erro:', error.message);
      logger.error('Stack trace:', error.stack);
    }
    // Não encerramos o processo aqui para permitir que o Redis tente reconectar
  }
};

startServer();

// Gerenciamento de desligamento gracioso
process.on('SIGINT', async () => {
  try {
    await redisClient.quit();
    logger.info('Conexão com o Redis fechada');
    process.exit(0);
  } catch (error) {
    logger.error('Erro ao fechar a conexão com o Redis:', error);
    process.exit(1);
  }
});

export default app;
