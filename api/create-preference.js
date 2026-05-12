const MercadoPago = require('mercadopago');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
    return res.status(500).json({ error: 'Configuração do Mercado Pago ausente' });
  }

  MercadoPago.configure({ access_token: accessToken });

  const { total, itens, transactionId, email } = req.body;

  if (!total || total <= 0 || !itens || itens.length === 0 || !transactionId || !email) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const payment = {
      transaction_amount: Number(total),
      description: `Pedido ${transactionId}`,
      payment_method_id: 'pix',
      payer: { email },
      external_reference: transactionId,
      notification_url: `${process.env.VERCEL_URL || 'https://' + req.headers.host}/api/webhook`,
    };

    const response = await MercadoPago.payment.create(payment);
    const { point_of_interaction, id: paymentId } = response.body;
    const qrCodeBase64 = point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const qrCodeText = point_of_interaction?.transaction_data?.qr_code || null;

    if (!qrCodeBase64 || !qrCodeText) {
      throw new Error('Resposta do Mercado Pago não contém dados PIX');
    }

    res.status(200).json({
      paymentId,
      qrCode: `data:image/png;base64,${qrCodeBase64}`,
      qrCodeText,
      externalReference: transactionId,
    });
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao criar pagamento PIX' });
  }
};
