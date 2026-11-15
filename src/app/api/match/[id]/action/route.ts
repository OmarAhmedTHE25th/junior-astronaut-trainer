import { NextRequest, NextResponse } from 'next/server';
import { executeMatchAction } from '@/lib/matchmakingEngine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing match ID.' }, { status: 400 });
    }

    const body = await req.json();
    const { playerId, actionType, payload } = body;

    if (!playerId || !actionType) {
      return NextResponse.json(
        { success: false, error: 'Missing playerId or actionType in request.' },
        { status: 400 }
      );
    }

    const result = await executeMatchAction(id, String(playerId), actionType, payload || {});

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      match: result.match,
    });
  } catch (err: unknown) {
    console.error('POST /api/match/[id]/action error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Match action failed.' },
      { status: 500 }
    );
  }
}
