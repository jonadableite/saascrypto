// src/services/whatsapp.service.ts

import fetch from 'node-fetch';
import { logger } from '../config/logger';

export class WhatsAppService {
  private apiKey: string;
  private instance: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instance = process.env.EVOLUTION_INSTANCE || '';
    this.baseUrl = process.env.EVOLUTION_BASE_URL || '';
  }

  async sendMessage(phoneNumber: string, message: string) {
    const url = `${this.baseUrl}/message/sendText/${this.instance}`;
    const options = {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        textMessage: {
          text: message,
        },
        // Pode adicionar opções adicionais aqui, se necessário
        // options: {
        //   delay: 1200,
        //   linkPreview: false,
        // }
      }),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      logger.info(`📱 Mensagem WhatsApp enviada para ${phoneNumber}`);
      return data;
    } catch (error) {
      logger.error('❌ Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }
}
