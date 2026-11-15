import { NextResponse } from 'next/server';
import { getTournamentDetails } from '@/lib/tournamentEngine';
import { generateRivalTelemetrySnapshot } from '@/lib/survivalEngine';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const myEntrantId = searchParams.get('entrantId');
    const sol = Number(searchParams.get('sol')) || 1;

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'matchId is required' }, { status: 400 });
    }

    const details = await getTournamentDetails(id);
    const match = details.matches.find((m) => m.id === matchId);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Identify rival
    const isEntrantA = match.entrantAId === myEntrantId;
    const rivalId = isEntrantA ? match.entrantBId : match.entrantAId;
    const rivalName = isEntrantA ? match.entrantBName : match.entrantAName;
    const rivalAvatar = (isEntrantA ? match.entrantBAvatar : match.entrantAAvatar) || '🤖';

    if (!rivalId || !rivalName) {
      return NextResponse.json({
        success: true,
        rival: null,
        message: 'Awaiting opponent for this bracket slot',
      });
    }

    const rival = generateRivalTelemetrySnapshot(
      match.rngSeed,
      rivalId,
      rivalName,
      rivalAvatar,
      sol
    );

    return NextResponse.json({ success: true, rival, match });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get rival telemetry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
