import { NextResponse } from 'next/server';
import { joinTournament, startTournament, getTournamentDetails } from '@/lib/tournamentEngine';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, entrantId, entrantName, avatar } = body;

    if (action === 'START_WITH_BOTS') {
      const details = await startTournament(id);
      return NextResponse.json({ success: true, ...details });
    }

    if (!entrantId || !entrantName) {
      return NextResponse.json(
        { success: false, error: 'entrantId and entrantName are required' },
        { status: 400 }
      );
    }

    const details = await joinTournament(id, {
      entrantId,
      entrantName,
      avatar: avatar || '👨‍🚀',
    });

    return NextResponse.json({ success: true, ...details });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join tournament';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
