import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    logger.info(`✅ Usuário registrado com sucesso: ${user.email}`);
    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    logger.error(`❌ Erro ao registrar usuário: ${error}`);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '1d',
    });

    logger.info(`🔐 Usuário logado: ${user.email}`);
    res.json({ token });
  } catch (error) {
    logger.error(`❌ Erro ao fazer login: ${error}`);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
};
