const { stripe, applyCors, readBody, getStripeCustomerId, getSubscription } = require('./_shared');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = readBody(req);
    const customerId = await getStripeCustomerId(token);
    const sub = await getSubscription(customerId);
    if (!sub) return res.status(404).json({ error: 'No subscription found to resume' });

    // Passing an empty string clears the pause and resumes billing now.
    const updated = await stripe.subscriptions.update(sub.id, { pause_collection: '' });

    return res.status(200).json({
      paused: false,
      subscriptionId: updated.id,
      status: updated.status
    });
  } catch (e) {
    console.error('resume error:', e);
    return res.status(400).json({ error: e.message });
  }
};
