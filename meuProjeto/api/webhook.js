const admin = require('firebase-admin');
const MercadoPago = require('mercadopago');

// Inicializa o Firebase Admin SDK apenas uma vez
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  // Verifica se é uma requisição POST do Mercado Pago
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const notification = req.body;
  console.log('Webhook recebido:', JSON.stringify(notification, null, 2));

  // O Mercado Pago pode enviar um objeto com `type` e `data.id`
  if (notification.type === 'payment') {
    const paymentId = notification.data.id;

    // Configura o Access Token do Mercado Pago (da variável de ambiente)
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return res.status(500).send('Configuração ausente');
    }
    MercadoPago.configure({ access_token: accessToken });

    try {
      // Busca os detalhes do pagamento
      const payment = await MercadoPago.payment.findById(paymentId);
      const { status, external_reference } = payment.body;

      if (status === 'approved') {
        // Atualiza o pedido no Firestore
        const pedidoRef = db.collection('pedidos').doc(external_reference);
        const pedidoSnap = await pedidoRef.get();
        if (!pedidoSnap.exists) {
          console.log(`Pedido ${external_reference} não encontrado`);
          return res.status(200).send('OK');
        }

        const pedido = pedidoSnap.data();
        const batch = db.batch();

        // Atualiza status do pedido
        batch.update(pedidoRef, {
          status: 'pago',
          pagoEm: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Reduz o estoque de cada lanche
        if (pedido.lanches && Array.isArray(pedido.lanches)) {
          for (const item of pedido.lanches) {
            const lancheRef = db.collection('lanches').doc(item.id);
            batch.update(lancheRef, {
              quantidadeDisponivel: admin.firestore.FieldValue.increment(-item.quantidade),
            });
          }
        }

        await batch.commit();
        console.log(`Pedido ${external_reference} atualizado para PAGO e estoque reduzido.`);
      } else {
        console.log(`Pagamento ${paymentId} status: ${status}`);
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
    }
  } else {
    console.log('Notificação ignorada (tipo não é payment):', notification.type);
  }

  res.status(200).send('OK');
};