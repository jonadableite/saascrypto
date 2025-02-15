// src/templates/whatsappTemplate.ts

export function generateWhatsAppMessage(
  asset: string,
  signal: 'COMPRAR' | 'VENDER',
  price: number,
  reason: string,
  strength: 'FORTE' | 'MÉDIO' | 'FRACO',
): string {
  const signalEmoji = signal === 'COMPRAR' ? '🟢' : '🔴';
  const strengthEmoji =
    strength === 'FORTE' ? '💪' : strength === 'MÉDIO' ? '👍' : '🤔';

  return `
🚨 *SINAL DE TRADING FORTE* 🚨

${signalEmoji} *Ação:* ${signal} ${asset}
💰 *Preço:* $${price.toFixed(2)}
${strengthEmoji} *Força do Sinal:* ${strength}

📊 *Razão:* ${reason}

⚠️ *Lembre-se:* Este é um sinal automático. Sempre faça sua própria análise antes de tomar decisões de investimento.

🤖 Gerado pelo seu bot de trading
  `.trim();
}
