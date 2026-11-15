// ─── Stripe Hosted Checkout Portal Route Handler ───

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_BUNDLES } from '@/lib/marketplaceTypes';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bundleId, playerId } = body as {
      bundleId?: string;
      playerId?: string;
    };

    if (!bundleId || !playerId) {
      return NextResponse.json(
        { success: false, error: 'bundleId and playerId are required' },
        { status: 400 }
      );
    }

    const bundle = STRIPE_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) {
      return NextResponse.json(
        { success: false, error: `Unknown store bundle: ${bundleId}` },
        { status: 400 }
      );
    }

    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeApiKey || stripeApiKey.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'STRIPE_SECRET_KEY is not loaded on the server. Add it to .env.local and restart the dev server.',
        },
        { status: 500 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    try {
      const stripe = new Stripe(stripeApiKey);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: bundle.name,
                description: bundle.description || bundle.badge || 'Junior Astronaut live-service entitlement',
              },
              unit_amount: bundle.usdPriceCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          bundleId: bundle.id,
          playerId,
          mcAmount: bundle.mcAmount.toString(),
          isBattlePass: bundle.isBattlePass ? 'true' : 'false',
        },
        success_url: `${origin}/store?payment=success&bundleId=${bundle.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/store?payment=cancelled`,
      });

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        url: session.url,
      });
    } catch (stripeErr) {
      console.error('Stripe checkout error:', stripeErr);
      const errorMsg = stripeErr instanceof Error ? stripeErr.message : 'Stripe checkout failed';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }
  } catch (err) {
    console.error('Error initiating checkout session:', err);
    const message = err instanceof Error ? err.message : 'Checkout initiation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
