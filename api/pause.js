const { stripe, applyCors, readBody, getStripeCustomerId, getSubscription } = require('./_shared');

// How Stripe treats invoices during the pause. 'void' = no invoices created.
// Other options: 'keep_as_draft' or 'mark_uncollectible'.
const ALLOWED_BEHAVIORS = ['void', 'keep_as_draft', 'mark_uncollectible'];
const MAX_MONTHS = 12;

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = readBody(req);
    const token = body.token;
    let months = parseInt(body.months, 10);
    if (isNaN(months) || months < 1) months = 1;
    if (months > MAX_MONTHS) months = MAX_MONTHS;

    const behavior = ALLOWED_BEHAVIORS.indexOf(body.behavior) !== -1 ? body.behavior : 'void';

    const customerId = await getStripeCustomerId(token);
    const sub = await getSubscription(customerId, body.priceId);
    if (!sub) return res.status(404).json({ error: 'No subscription found to pause' });

    const resumeDate = new Date();
    resumeDate.setMonth(resumeDate.getMonth() + months);
    const resumesAt = Math.floor(resumeDate.getTime() / 1000);

    const updated = await stripe.subscriptions.update(sub.id, {
      pause_collection: { behavior: behavior, resumes_at: resumesAt }
    });

    return res.status(200).json({
      paused: true,
      subscriptionId: updated.id,
      resumesAt: updated.pause_collection ? updated.pause_collection.resumes_at : resumesAt,
      behavior: behavior
    });
  } catch (e) {
    console.error('pause error:', e);
    return res.status(400).json({ error: e.message });
  }
};
