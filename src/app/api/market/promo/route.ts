import { NextResponse } from 'next/server';
import { redeemPromoCode } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, code = '' } = body;

    if (!playerId || playerId === 'cadet-nova-01') {
      return NextResponse.json(
        { success: false, error: 'A valid persistent playerId is required to redeem promo codes' },
        { status: 400 }
      );
    }

    const result = await redeemPromoCode(playerId, code);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error redeeming promo code';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
