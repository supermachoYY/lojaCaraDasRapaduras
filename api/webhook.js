const admin = require('firebase-admin');
const MercadoPago = require('mercadopago');

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
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const notification = req.body;
  console.log('Webhook recebido:', JSON.stringify(notification, null, 2));

  if (notification.type === 'payment') {
    const paymentId = notification.data.id;

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return res.status(500).send('Configuração ausente');
    }
    MercadoPago.configure({ access_token: accessToken });

    try {
      const payment = await MercadoPago.payment.get(paymentId);
      const { status, external_reference } = payment.body;

      if (status === 'approved') {
        const snapshot = await db.collection('pedidos')
          .where('transactionId', '==', external_reference)
          .get();

        if (snapshot.empty) {
          console.log(`Nenhum pedido encontrado com transactionId ${external_reference}`);
          return res.status(200).send('OK');
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.update(doc.ref, {
            status: 'pago',
            pagoEm: admin.firestore.FieldValue.serverTimestamp(),
          });

          const pedido = doc.data();
          if (pedido.lanches && Array.isArray(pedido.lanches)) {
            for (const item of pedido.lanches) {
              const lancheRef = db.collection('lanches').doc(item.id);
              batch.update(lancheRef, {
                quantidadeDisponivel: admin.firestore.FieldValue.increment(-item.quantidade),
              });
            }
          }
        });

        await batch.commit();
        console.log(`Pedidos com transactionId ${external_reference} atualizados para PAGO.`);
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
