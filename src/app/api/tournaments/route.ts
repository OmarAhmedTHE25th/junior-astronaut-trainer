import { NextResponse } from 'next/server';
import { listTournaments, createTournament } from '@/lib/tournamentEngine';

export async function GET() {
  try {
    const tournaments = await listTournaments();
    return NextResponse.json({ success: true, tournaments });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list tournaments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, mode, maxEntrants, creatorId, creatorName, creatorAvatar } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json(
        { success: false, error: 'creatorId and creatorName are required' },
        { status: 400 }
      );
    }

    const details = await createTournament({
      title: title || 'Mars Endurance Championship 2026',
      mode: mode || 'solo',
      maxEntrants: maxEntrants === 4 || maxEntrants === 16 ? maxEntrants : 8,
      creatorId,
      creatorName,
      creatorAvatar: creatorAvatar || '👨‍🚀',
    });

    return NextResponse.json({ success: true, ...details });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create tournament';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
