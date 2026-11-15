import { NextResponse } from 'next/server';
import { executeStorePurchase } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, buyerId, itemSlug, quantity, isGrant } = body;
    const finalPlayerId = playerId || buyerId;

    if (!finalPlayerId || !itemSlug || !quantity) {
      return NextResponse.json(
        { success: false, error: 'playerId, itemSlug, and quantity are required' },
        { status: 400 }
      );
    }

    const result = await executeStorePurchase({
      playerId: finalPlayerId,
      itemSlug,
      quantity: Number(quantity),
      isGrant: Boolean(isGrant),
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Store purchase failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
