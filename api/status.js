const { applyCors, readBody, getStripeCustomerId, getSubscription } = require('./_shared');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, priceId } = readBody(req);
    const customerId = await getStripeCustomerId(token);
    const sub = await getSubscription(customerId, priceId);

    if (!sub) {
      return res.status(200).json({ hasSubscription: false, paused: false });
    }

    const paused = !!sub.pause_collection;
    const resumesAt = paused ? sub.pause_collection.resumes_at : null;

    return res.status(200).json({
      hasSubscription: true,
      subscriptionId: sub.id,
      status: sub.status,
      paused: paused,
      resumesAt: resumesAt,
      currentPeriodEnd: sub.current_period_end || null
    });
  } catch (e) {
    console.error('status error:', e);
    return res.status(400).json({ error: e.message });
  }
};
