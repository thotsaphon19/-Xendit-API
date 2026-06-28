// Xendit Credit Card Charge
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://siam-heritage-8a0c5.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token_id, amount, currency = 'THB', description, customer } = req.body;
  if (!token_id || !amount) return res.status(400).json({ error: 'Missing token_id or amount' });

  try {
    const response = await fetch('https://api.xendit.co/credit_card_charges', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token_id,
        external_id: 'SH-' + Date.now(),
        amount,
        currency,
        description: description || 'Siam Heritage Order',
        capture: true,
        billing_details: customer ? {
          given_names: customer.name,
          email: customer.email,
          mobile_number: customer.phone
        } : undefined
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message || 'Charge failed' });
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
