const { MercadoPagoConfig, Preference } = require('mercadopago');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ Token do Mercado Pago não configurado');
    return res.status(500).json({ error: 'Token não configurado' });
  }

  const { total, itens, pedidoId } = req.body;
  
  // Validação detalhada
  if (!total) {
    return res.status(400).json({ error: 'Campo "total" ausente' });
  }
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Campo "itens" inválido' });
  }
  if (!pedidoId) {
    return res.status(400).json({ error: 'Campo "pedidoId" ausente' });
  }

  console.log('📦 Dados recebidos na Vercel:', JSON.stringify({ total, itens, pedidoId }, null, 2));

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  try {
    const body = {
      items: itens.map(item => ({
        title: item.nome,
        quantity: Number(item.quantidade),
        unit_price: Number(item.preco),
        currency_id: 'BRL',
      })),
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1,
      },
      back_urls: {
        success: 'allanches://pagamento?status=approved',
        failure: 'allanches://pagamento?status=rejected',
        pending: 'allanches://pagamento?status=pending',
      },
      auto_return: 'approved',
      external_reference: pedidoId,
      notification_url: `https://${req.headers.host}/api/webhook`,
    };

    const response = await preference.create({ body });
    console.log('✅ Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

    const { id, init_point, point_of_interaction } = response;
    const qrCodeBase64 = point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const qrCodeText = point_of_interaction?.transaction_data?.qr_code || null;

    if (!qrCodeBase64) {
      console.error('❌ QR Code não gerado. Verifique se o Access Token tem permissão para PIX.');
      return res.status(500).json({ error: 'QR Code não gerado pelo Mercado Pago' });
    }

    res.status(200).json({
      preferenceId: id,
      init_point,
      qrCode: `data:image/png;base64,${qrCodeBase64}`,
      qrCodeText,
      externalReference: pedidoId,
    });
  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro interno ao criar pagamento' });
  }
};