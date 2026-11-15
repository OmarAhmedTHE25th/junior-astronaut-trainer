import { NextResponse } from 'next/server';
import { pollPendingSabotage } from '@/lib/sabotageEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerId = body.playerId;
    const contextId = body.contextId;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId is required' },
        { status: 400 }
      );
    }

    const events = await pollPendingSabotage(playerId, contextId);
    return NextResponse.json({ success: true, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to poll sabotage events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const contextId = searchParams.get('contextId') || undefined;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId is required' },
        { status: 400 }
      );
    }

    const events = await pollPendingSabotage(playerId, contextId);
    return NextResponse.json({ success: true, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to poll sabotage events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
