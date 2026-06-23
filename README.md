# MemberScript #246 — Pause Subscription API

A tiny [Vercel](https://vercel.com) backend that lets logged-in Memberstack members **pause their Stripe subscription for X months** (and resume it) from your own Webflow buttons — **no Stripe Customer Portal required**.

Pausing a Stripe subscription needs the Stripe **secret key**, which can never live in front-end code. This backend holds the secret key securely, verifies the member with the Memberstack Admin API, and calls Stripe on their behalf.

Use it together with the front-end script **MemberScript #246** from [memberstack.com/memberscripts](https://www.memberstack.com/memberscripts).

---

## Endpoints

All endpoints are `POST` and take a JSON body containing the member's Memberstack JWT.

| Endpoint | Body | Returns |
|---|---|---|
| `/api/status` | `{ token }` | `{ hasSubscription, subscriptionId, status, paused, resumesAt }` |
| `/api/pause` | `{ token, months, behavior? }` | `{ paused: true, subscriptionId, resumesAt }` |
| `/api/resume` | `{ token }` | `{ paused: false, subscriptionId, status }` |

The Stripe customer ID is always derived from the **verified token**, never the request body, so a member can only ever act on their own subscription.

---

## Deploy to your own Vercel

### 1. Clone (or fork) this repo

```bash
git clone https://github.com/Magnaem-a/memberscript246.git
cd memberscript246
```

### 2. Deploy to Vercel

Either import the repo in the [Vercel dashboard](https://vercel.com/new), or use the CLI:

```bash
npm i -g vercel
vercel --prod
```

### 3. Add your secret keys

In your Vercel project → **Settings → Environment Variables**, add (for Production, Preview, and Development):

| Name | Value | Where to find it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | [Stripe → Developers → API keys](https://dashboard.stripe.com/apikeys) |
| `MEMBERSTACK_SECRET_KEY` | `sk_...` | Memberstack → Settings → Dev tools → API keys (the **secret** key) |

Then **redeploy** so the variables take effect.

> Tip: start with Stripe **test-mode** keys and a test subscription before switching to live keys.

### 4. Wire up Webflow

Add your Vercel URL (with `https://`, no trailing slash) to the `ms-code-api` attribute on the `[data-ms-code="pause-subscription"]` container, and paste MemberScript #246 before `</body>`. Full Webflow HTML is in the setup guide.

---

## Configuration

- **Pause behavior** — `pause.js` defaults to `void` (Stripe creates no invoices during the pause). The front-end can override per request with `behavior` (`void`, `keep_as_draft`, or `mark_uncollectible`).
- **Max pause length** — capped at 12 months in `pause.js` (`MAX_MONTHS`).
- **Multiple subscriptions** — `_shared.js → getSubscription` targets the first active subscription. Adjust the filter if you need to target a specific plan.
- **CORS** — `vercel.json` allows all origins (`*`). For production, set it to your exact Webflow domain.

---

## Files

```
memberscript246/
  package.json        dependencies (@memberstack/admin, stripe)
  vercel.json         CORS headers + framework: null
  api/
    _shared.js        token verification + Stripe lookup helpers
    status.js         report paused state + resume date
    pause.js          pause for X months
    resume.js         resume billing now
```

## Security

- Secret keys live only in Vercel environment variables — never sent to the browser.
- Every request is authenticated with the member's Memberstack JWT before touching Stripe.
- Lock `Access-Control-Allow-Origin` to your domain in `vercel.json` for production.

## License

MIT
