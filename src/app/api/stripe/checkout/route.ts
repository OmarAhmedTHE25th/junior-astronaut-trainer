// ─── Stripe Test Mode & Sandbox Checkout Route Handler ───

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_BUNDLES } from '@/lib/marketplaceTypes';
import { rewardPlayerCredits } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bundleId, playerId, isSandbox = false, returnUrl } = body as {
      bundleId?: string;
      playerId?: string;
      isSandbox?: boolean;
      returnUrl?: string;
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

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;

    // 1. If Stripe API Key is provided and not explicitly running sandbox test override:
    if (stripeApiKey && !isSandbox) {
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
                  description: bundle.badge || 'Junior Astronaut live-service entitlement',
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
          success_url: returnUrl || `${origin}/store?payment=success&bundleId=${bundle.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/store?payment=cancelled`,
        });

        return NextResponse.json({
          success: true,
          url: session.url,
          checkoutUrl: session.url,
          isSandbox: false,
          sandbox: false,
        });
      } catch (stripeErr) {
        console.error('Stripe checkout error:', stripeErr);
        const errorMsg = stripeErr instanceof Error ? stripeErr.message : 'Stripe checkout failed';
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }
    }

    // 2. Sandbox / Test Mode Instant Fulfillment:
    let newBalance: number | undefined;
    if (bundle.mcAmount > 0) {
      const res = await rewardPlayerCredits(playerId, bundle.mcAmount);
      newBalance = res.newBalance;
    }

    const sandboxRedirectUrl = returnUrl
      ? `${returnUrl}&sandbox=true`
      : `${origin}/store?payment=success&bundleId=${bundle.id}&sandbox=true`;

    return NextResponse.json({
      success: true,
      url: sandboxRedirectUrl,
      checkoutUrl: sandboxRedirectUrl,
      isSandbox: true,
      sandbox: true,
      bundle,
      newBalance,
      message: `Sandbox Test Mode: ${bundle.name} fulfilled successfully!`,
    });
  } catch (err) {
    console.error('Error initiating checkout session:', err);
    const message = err instanceof Error ? err.message : 'Checkout initiation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
