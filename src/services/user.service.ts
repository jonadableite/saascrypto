// src/services/userService.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../config/logger';
import redisClient from '../config/redis';

const prisma = new PrismaClient();

export const createUser = async (email: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  await redisClient.set(`user:${user.id}`, JSON.stringify(user));

  return user;
};

export const findUserByEmail = async (email: string) => {
  const cachedUser = await redisClient.get(`user:email:${email}`);
  if (cachedUser) {
    logger.info('Usuário encontrado no cache do Redis');
    return JSON.parse(cachedUser);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await redisClient.set(`user:email:${email}`, JSON.stringify(user));
    await redisClient.set(`user:${user.id}`, JSON.stringify(user));
  }

  return user;
};
