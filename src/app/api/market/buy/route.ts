import { NextResponse } from 'next/server';
import { executePurchase, executeStorePurchase } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerId, buyerName, listingId, itemSlug, quantityToBuy, quantity } = body;
    const finalQty = Number(quantityToBuy || quantity || 1);

    // Direct Supply Store purchase
    if (itemSlug) {
      if (!buyerId) {
        return NextResponse.json(
          { success: false, error: 'buyerId is required for store purchase' },
          { status: 400 }
        );
      }
      const result = await executeStorePurchase({
        playerId: buyerId,
        itemSlug,
        quantity: finalQty,
      });
      return NextResponse.json(result);
    }

    // Peer-to-peer listing purchase
    if (!buyerId || !listingId || !finalQty) {
      return NextResponse.json(
        { success: false, error: 'buyerId, listingId, and quantityToBuy are required' },
        { status: 400 }
      );
    }

    const result = await executePurchase({
      buyerId,
      buyerName: buyerName || 'Cadet Buyer',
      listingId,
      quantityToBuy: finalQty,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
