import Stripe from 'stripe';
import Ad from '../models/Ad.js';
const stripe = new Stripe(process.env.STRIPE_SECRET || 'sk_test_placeholder');
export async function createCheckoutSession(adId, userId, style = 'normal') {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{ price_data: { currency: 'usd', product_data: { name: style === 'cartoon' ? '🎨 Cartoon Featured Ad' : '⭐ Featured Ad Boost' }, unit_amount: style === 'cartoon' ? 800 : 500 }, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/success?adId=${adId}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { adId, userId, style }
  });
  return session.url;
}
export async function handleStripeWebhook(req, res) {
  const event = req.body;
  if (event.type === 'checkout.session.completed') {
    const { adId, style } = event.data.object.metadata;
    await Ad.findByIdAndUpdate(adId, { isFeatured: true, featuredStyle: style || 'normal', featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  }
  res.sendStatus(200);
}
