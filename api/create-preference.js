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

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const { total, itens, pedidoId } = req.body;
  if (!total || !itens || !itens.length || !pedidoId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const body = {
      items: itens.map(item => ({
        title: item.nome,
        quantity: Number(item.quantidade),
        unit_price: Number(item.preco),
        currency_id: 'BRL',
      })),
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
    const { id, init_point, point_of_interaction } = response;

    const qrCodeBase64 = point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const qrCodeText = point_of_interaction?.transaction_data?.qr_code || null;

    res.status(200).json({
      preferenceId: id,
      init_point,
      qrCode: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
      qrCodeText,
      externalReference: pedidoId,
    });
  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro interno ao criar pagamento' });
  }
};