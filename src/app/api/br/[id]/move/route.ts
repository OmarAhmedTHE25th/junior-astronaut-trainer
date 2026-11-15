import { NextResponse } from 'next/server';
import { movePlayerInMatch } from '@/lib/battleRoyale';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { playerId, targetX, targetY } = body;

    if (!playerId || targetX === undefined || targetY === undefined) {
      return NextResponse.json(
        { success: false, error: 'playerId, targetX, and targetY are required' },
        { status: 400 }
      );
    }

    const result = await movePlayerInMatch({
      matchId: id,
      playerId,
      targetX: Number(targetX),
      targetY: Number(targetY),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move in match';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
