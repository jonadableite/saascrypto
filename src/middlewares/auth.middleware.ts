// src/middlewares/auth.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = (decoded as any).userId;
    next();
  } catch (error) {
    logger.error(`❌ Erro de autenticação: ${error}`);
    return res.status(401).json({ message: 'Token inválido' });
  }
};
