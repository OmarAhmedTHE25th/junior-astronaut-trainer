import { NextRequest, NextResponse } from 'next/server';
import { getSquadRoom } from '@/lib/storageAdapter';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing squad room code' },
        { status: 400 }
      );
    }

    const room = await getSquadRoom(code);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Squad room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (err: unknown) {
    console.error('GET /api/squad/[code] error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
