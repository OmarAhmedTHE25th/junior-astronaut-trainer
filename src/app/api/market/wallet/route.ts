import { NextResponse } from 'next/server';
import { getPlayerWallet, getPlayerInventory } from '@/lib/marketplace';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    const wallet = await getPlayerWallet(playerId);
    const inventory = await getPlayerInventory(playerId);

    return NextResponse.json({
      success: true,
      wallet,
      inventory,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get wallet & inventory';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
