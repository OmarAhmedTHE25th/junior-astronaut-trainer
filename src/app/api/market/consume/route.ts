import { NextResponse } from 'next/server';
import { consumePlayerItem } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, itemSlug, count = 1 } = body;

    if (!playerId || !itemSlug) {
      return NextResponse.json(
        { success: false, error: 'playerId and itemSlug are required' },
        { status: 400 }
      );
    }

    const result = await consumePlayerItem(playerId, itemSlug, count);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to consume item' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      remainingQuantity: result.remainingQuantity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error consuming marketplace item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
