import { NextResponse } from 'next/server';
import { ensurePlayerWallet, getPlayerInventory, setPlayerVipStatus } from '@/lib/marketplace';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId') || searchParams.get('cadetId');

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId or cadetId is required' }, { status: 400 });
    }

    const [wallet, inventory] = await Promise.all([
      ensurePlayerWallet(playerId),
      getPlayerInventory(playerId),
    ]);

    return NextResponse.json({
      success: true,
      wallet,
      creditsBalance: wallet.creditsBalance,
      isFiveStarGeneral: Boolean(wallet.isFiveStarGeneral),
      inventory,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get wallet & inventory';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, isFiveStarGeneral } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    if (typeof isFiveStarGeneral === 'boolean') {
      const wallet = await setPlayerVipStatus(playerId, isFiveStarGeneral);
      return NextResponse.json({
        success: true,
        wallet,
        creditsBalance: wallet.creditsBalance,
        isFiveStarGeneral: Boolean(wallet.isFiveStarGeneral),
      });
    }

    const wallet = await ensurePlayerWallet(playerId);
    return NextResponse.json({
      success: true,
      wallet,
      creditsBalance: wallet.creditsBalance,
      isFiveStarGeneral: Boolean(wallet.isFiveStarGeneral),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update wallet';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
