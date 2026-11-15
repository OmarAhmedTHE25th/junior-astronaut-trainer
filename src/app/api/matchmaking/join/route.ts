import { NextRequest, NextResponse } from 'next/server';
import { joinMatchmakingQueue } from '@/lib/matchmakingEngine';
import type { SquadRole } from '@/lib/matchmakingTypes';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, playerName, avatar, preferredRole } = body;

    if (!playerId || !playerName) {
      return NextResponse.json(
        { success: false, error: 'Missing playerId or playerName.' },
        { status: 400 }
      );
    }

    const result = await joinMatchmakingQueue({
      playerId: String(playerId),
      playerName: String(playerName),
      avatar: avatar ? String(avatar) : '👨‍🚀',
      preferredRole: (preferredRole as SquadRole) || 'commander',
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      matchId: result.matchId,
      queueCount: result.queueCount,
    });
  } catch (err: unknown) {
    console.error('POST /api/matchmaking/join error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Matchmaking join failed.' },
      { status: 500 }
    );
  }
}
