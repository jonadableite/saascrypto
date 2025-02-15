import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
// src/config/logger.ts
import winston from 'winston';

const timeZone = 'America/Sao_Paulo';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => {
        const nowUtc = new Date();
        const nowBrazil = toZonedTime(nowUtc, timeZone);
        return format(nowBrazil, 'dd/MM/yyyy HH:mm:ss');
      },
    }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'crypto-bot-saas-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

export { logger };
