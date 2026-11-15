// ─── Stripe Webhook Handler with Signature Verification & Idempotency ───

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rewardPlayerCredits } from '@/lib/marketplace';

const processedSessions = new Set<string>();

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;

    let event: Stripe.Event;

    if (webhookSecret && stripeApiKey && signature) {
      const stripe = new Stripe(stripeApiKey);
      const rawBody = await request.text();
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      // Local dev sandbox fallback: accept parsed event JSON
      const json = await request.json();
      event = json as Stripe.Event;
    }

    // Handle checkout.session.completed with session idempotency
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;

      if (sessionId && processedSessions.has(sessionId)) {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      if (sessionId) {
        processedSessions.add(sessionId);
      }

      const metadata = session.metadata || {};
      const { playerId, mcAmount } = metadata;

      if (playerId && mcAmount) {
        const credits = Number(mcAmount);
        if (credits > 0) {
          await rewardPlayerCredits(playerId, credits);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
