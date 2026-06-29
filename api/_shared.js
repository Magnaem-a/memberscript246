const memberstackAdmin = require('@memberstack/admin');
const Stripe = require('stripe');

const memberstack = memberstackAdmin.init(process.env.MEMBERSTACK_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

// Verify the Memberstack JWT and return the member's Stripe customer ID.
// The customer ID always comes from the verified token, never the request body,
// so a member can only ever act on their own subscription.
async function getStripeCustomerId(token) {
  if (!token) throw new Error('Missing member token');

  // verifyToken returns the decoded JWT payload; the member ID is in id/sub.
  const verified = await memberstack.verifyToken({ token });
  const memberId = verified.id || verified.sub || (verified.data && verified.data.id);
  if (!memberId) throw new Error('Could not identify the member');

  const result = await memberstack.members.retrieve({ id: memberId });
  const member = result.data || result;
  const customerId = member.stripeCustomerId;
  if (!customerId) throw new Error('No Stripe customer found for this member');
  return customerId;
}

// Return the member's most relevant subscription (active or paused), or null.
// When a STRIPE identifier is provided (price ID "price_..." or product ID
// "prod_..."), only subscriptions containing it are considered — this is how a
// member with more than one paid plan targets the right one. Any other value
// (e.g. a Memberstack "prc_"/"pln_" ID, which can't be matched against Stripe)
// is ignored, and the first active subscription is used (single-plan default).
async function getSubscription(customerId, priceId) {
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100
  });
  let subs = list.data || [];

  const isStripePrice = typeof priceId === 'string' && priceId.indexOf('price_') === 0;
  const isStripeProduct = typeof priceId === 'string' && priceId.indexOf('prod_') === 0;
  if (isStripePrice || isStripeProduct) {
    subs = subs.filter(function(s) {
      const items = (s.items && s.items.data) || [];
      return items.some(function(it) {
        if (!it.price) return false;
        return isStripeProduct ? it.price.product === priceId : it.price.id === priceId;
      });
    });
  } else if (priceId) {
    console.warn('Memberscript #246: ms-code-price-id "' + priceId + '" is not a Stripe price/product ID (expected "price_..."). Ignoring it and using the first active subscription.');
  }

  const live = subs.filter(function(s) {
    return s.status === 'active' || s.status === 'trialing' || s.status === 'past_due';
  });
  return live[0] || subs[0] || null;
}

module.exports = { stripe, applyCors, readBody, getStripeCustomerId, getSubscription };
