import { NextResponse } from 'next/server';
import { getOrCreateCommanderProfile } from '@/lib/battleRoyale';

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const cleanUser = decodeURIComponent(username || '').trim();

    // Use username as the lookup or generated ID
    const playerId = `cadet-${cleanUser.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const profile = await getOrCreateCommanderProfile(playerId, cleanUser);

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch commander profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
