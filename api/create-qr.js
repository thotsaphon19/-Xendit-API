// Xendit PromptPay Dynamic QR
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://siam-heritage-8a0c5.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, orderNumber } = req.body;
  try {
    const response = await fetch('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: orderNumber || 'SH-' + Date.now(),
        type: 'DYNAMIC',
        currency: 'THB',
        amount,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message });
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
