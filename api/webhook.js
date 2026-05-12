const { MercadoPago, Payment } = require('mercadopago');
const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ Token do Mercado Pago não configurado');
    return res.status(500).send('Token não configurado');
  }

  const client = new MercadoPago({ accessToken });
  const paymentResource = new Payment(client);

  const notification = req.body;
  console.log('📬 Webhook recebido:', JSON.stringify(notification, null, 2));

  if (notification.type === 'payment') {
    const paymentId = notification.data.id;
    try {
      const { body } = await paymentResource.get({ id: paymentId });
      const { status, external_reference } = body;

      if (status === 'approved') {
        const pedidoRef = db.collection('pedidos').doc(external_reference);
        const pedidoSnap = await pedidoRef.get();
        if (!pedidoSnap.exists) {
          console.log(`⚠️ Pedido ${external_reference} não encontrado`);
          return res.status(200).send('OK');
        }

        const pedido = pedidoSnap.data();
        const batch = db.batch();
        batch.update(pedidoRef, {
          status: 'pago',
          pagoEm: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (pedido.lanches && Array.isArray(pedido.lanches)) {
          for (const item of pedido.lanches) {
            const lancheRef = db.collection('lanches').doc(item.id);
            batch.update(lancheRef, {
              quantidadeDisponivel: admin.firestore.FieldValue.increment(-item.quantidade),
            });
          }
        }

        await batch.commit();
        console.log(`✅ Pedido ${external_reference} atualizado para PAGO.`);
      } else {
        console.log(`ℹ️ Pagamento ${paymentId} status: ${status}`);
      }
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
    }
  }

  res.status(200).send('OK');
};