// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    content: string,
    isHtml = false,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_SENDER_EMAIL,
        to,
        subject,
        [isHtml ? 'html' : 'text']: content,
      });
      logger.info(`📧 E-mail enviado com sucesso para ${to}`);
    } catch (error) {
      logger.error(`❌ Erro ao enviar e-mail para ${to}:`, error);
      throw new Error(`Falha ao enviar e-mail: ${(error as Error).message}`);
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info(
        '✅ Conexão com o servidor de e-mail estabelecida com sucesso',
      );
    } catch (error) {
      logger.error('❌ Falha na conexão com o servidor de e-mail:', error);
      throw new Error(
        `Falha na conexão com o servidor de e-mail: ${(error as Error).message}`,
      );
    }
  }
}
