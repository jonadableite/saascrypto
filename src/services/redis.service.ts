// src/services/redis.service.ts
import Redis from 'ioredis';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || '');
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, expireTime?: number): Promise<void> {
    if (expireTime) {
      await this.client.set(key, value, 'EX', expireTime);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
