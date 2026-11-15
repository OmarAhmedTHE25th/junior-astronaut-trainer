import { NextResponse } from 'next/server';
import { executeBRSabotage } from '@/lib/battleRoyale';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { attackerId, targetPlayerId, sabotageSlug, paymentType = 'power' } = body;

    if (!attackerId || !targetPlayerId || !sabotageSlug) {
      return NextResponse.json(
        { success: false, error: 'attackerId, targetPlayerId, and sabotageSlug are required' },
        { status: 400 }
      );
    }

    const result = await executeBRSabotage({
      matchId: id,
      attackerId,
      targetPlayerId,
      sabotageSlug,
      paymentType,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to execute Battle Royale sabotage';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
