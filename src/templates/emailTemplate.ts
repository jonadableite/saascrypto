// src/templates/emailTemplate.ts

export function generateEmailTemplate(
  asset: string,
  signal: 'COMPRAR' | 'VENDER',
  price: number,
  reason: string,
  strength: 'FORTE' | 'MÉDIO' | 'FRACO',
): string {
  const signalColor = signal === 'COMPRAR' ? '#4CAF50' : '#F44336';
  const strengthColor =
    strength === 'FORTE'
      ? '#4CAF50'
      : strength === 'MÉDIO'
        ? '#FFA500'
        : '#F44336';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sinal de Trading</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 5px;
          padding: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
          text-align: center;
        }
        .signal {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 10px;
          background-color: ${signalColor};
          color: white;
          border-radius: 5px;
        }
        .details {
          margin-top: 20px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .strength {
          font-weight: bold;
          color: ${strengthColor};
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Novo Sinal de Trading</h1>
        <div class="signal">${signal} ${asset}</div>
        <div class="details">
          <div class="detail-row">
            <span>Ativo:</span>
            <strong>${asset}</strong>
          </div>
          <div class="detail-row">
            <span>Preço:</span>
            <strong>$${price.toFixed(2)}</strong>
          </div>
          <div class="detail-row">
            <span>Força do Sinal:</span>
            <span class="strength">${strength}</span>
          </div>
          <div class="detail-row">
            <span>Razão:</span>
            <span>${reason}</span>
          </div>
        </div>
        <div class="footer">
          Este é um sinal automático gerado pelo seu bot de trading.
          Sempre faça sua própria análise antes de tomar decisões de investimento.
        </div>
      </div>
    </body>
    </html>
  `;
}
