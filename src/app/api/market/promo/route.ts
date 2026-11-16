import { NextResponse } from 'next/server';
import { redeemPromoCode } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId = 'cadet-nova-01', code = '' } = body;

    const result = await redeemPromoCode(playerId, code);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error redeeming promo code';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
