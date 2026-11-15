import { NextResponse } from 'next/server';
import { rewardPlayerCredits } from '@/lib/marketplace';
import { awardPetXp } from '@/lib/battleRoyale';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, credits = 0, petId, petXp = 0 } = body;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId is required' },
        { status: 400 }
      );
    }

    const walletResult = await rewardPlayerCredits(playerId, credits);

    let petResult = null;
    if (petId && petXp > 0) {
      petResult = await awardPetXp(playerId, petId, petXp);
    }

    return NextResponse.json({
      success: true,
      newBalance: walletResult.newBalance,
      creditsAwarded: credits,
      petResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error rewarding mission completion credits';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
