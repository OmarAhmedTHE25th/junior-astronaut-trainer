import { NextRequest, NextResponse } from 'next/server';
import {
  checkMatchmakingStatus,
  leaveMatchmakingQueue,
  forceStartWithBots,
} from '@/lib/matchmakingEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing playerId query parameter.' },
        { status: 400 }
      );
    }

    const result = await checkMatchmakingStatus(playerId);

    return NextResponse.json({
      success: true,
      status: result.status,
      matchId: result.matchId,
      queueCount: result.queueCount,
      countdownSeconds: result.countdownSeconds,
    });
  } catch (err: unknown) {
    console.error('GET /api/matchmaking/status error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Matchmaking status check failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, action } = body;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing playerId in request body.' },
        { status: 400 }
      );
    }

    if (action === 'CANCEL') {
      await leaveMatchmakingQueue(String(playerId));
      return NextResponse.json({
        success: true,
        status: 'cancelled',
      });
    }

    if (action === 'FORCE_START') {
      const { matchId } = await forceStartWithBots(String(playerId));
      return NextResponse.json({
        success: true,
        status: 'matched',
        matchId,
      });
    }

    const result = await checkMatchmakingStatus(String(playerId));
    return NextResponse.json({
      success: true,
      status: result.status,
      matchId: result.matchId,
      queueCount: result.queueCount,
      countdownSeconds: result.countdownSeconds,
    });
  } catch (err: unknown) {
    console.error('POST /api/matchmaking/status error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 500 }
    );
  }
}
