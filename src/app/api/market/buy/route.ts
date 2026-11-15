import { NextResponse } from 'next/server';
import { executePurchase } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerId, buyerName, listingId, quantityToBuy } = body;

    if (!buyerId || !listingId || !quantityToBuy) {
      return NextResponse.json(
        { success: false, error: 'buyerId, listingId, and quantityToBuy are required' },
        { status: 400 }
      );
    }

    const result = await executePurchase({
      buyerId,
      buyerName: buyerName || 'Cadet Buyer',
      listingId,
      quantityToBuy: Number(quantityToBuy),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
