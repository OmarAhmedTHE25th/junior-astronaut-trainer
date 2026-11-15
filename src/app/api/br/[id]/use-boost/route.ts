import { NextResponse } from 'next/server';
import { useBoostInMatch } from '@/lib/battleRoyale';
import type { BoostSlug } from '@/lib/battleRoyaleTypes';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { playerId, boostSlug } = body;

    if (!playerId || !boostSlug) {
      return NextResponse.json(
        { success: false, error: 'playerId and boostSlug are required' },
        { status: 400 }
      );
    }

    const match = await useBoostInMatch({
      matchId: id,
      playerId,
      boostSlug: boostSlug as BoostSlug,
    });

    return NextResponse.json({ success: true, match });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to activate boost';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
