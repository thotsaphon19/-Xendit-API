// Xendit Webhook → Update Firestore order status
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const token = req.headers['x-callback-token'];
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || 'e0bbamG5dDlOJMU9L8iy9gkOj1QHbMZdqWiETbG4qXISxOBz';
  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const event = req.body;
  const db = admin.firestore();

  try {
    if (event.event === 'qr.payment') {
      // PromptPay QR paid
      const orderSnap = await db.collection('orders')
        .where('orderNumber', '==', event.data?.reference_id).limit(1).get();
      
      if (!orderSnap.empty) {
        const orderRef = orderSnap.docs[0].ref;
        const order = orderSnap.docs[0].data();
        await orderRef.update({
          paymentStatus: 'paid',
          status: 'confirmed',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          xenditPaymentId: event.data?.id
        });
        // Notify user
        if (order.userId) {
          await db.collection('notifications').add({
            userId: order.userId,
            type: 'order_paid',
            title: '💳 ชำระเงินสำเร็จ',
            message: `ยืนยันชำระเงิน ฿${(order.total||0).toLocaleString()} สำเร็จ`,
            data: { orderId: orderSnap.docs[0].id, orderNumber: order.orderNumber },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    } else if (event.event === 'credit_card.charge') {
      // Credit card charged
      if (event.data?.status === 'CAPTURED') {
        const orderSnap = await db.collection('orders')
          .where('orderNumber', '==', event.data?.external_id).limit(1).get();
        if (!orderSnap.empty) {
          await orderSnap.docs[0].ref.update({
            paymentStatus: 'paid',
            status: 'confirmed',
            paidAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch(e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: e.message });
  }
}
