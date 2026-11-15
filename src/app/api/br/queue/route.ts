import { NextResponse } from 'next/server';
import { createOrQueueBRMatch } from '@/lib/battleRoyale';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, username, avatar, equippedPetId, activeBoosts } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    const match = await createOrQueueBRMatch({
      playerId,
      username: username || 'Commander Nova',
      avatar: avatar || '👨‍🚀',
      equippedPetId,
      activeBoosts: activeBoosts || [],
    });

    return NextResponse.json({ success: true, match });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to queue for Battle Royale';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
