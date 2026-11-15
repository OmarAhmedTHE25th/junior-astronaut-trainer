import { NextResponse } from 'next/server';
import { reportMatchResult } from '@/lib/tournamentEngine';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { matchId, entrantId, solsSurvived, hoursSurvived, resources } = body;

    if (!matchId || !entrantId || solsSurvived === undefined) {
      return NextResponse.json(
        { success: false, error: 'matchId, entrantId, and solsSurvived are required' },
        { status: 400 }
      );
    }

    const details = await reportMatchResult({
      tournamentId: id,
      matchId,
      entrantId,
      solsSurvived: Number(solsSurvived) || 0,
      hoursSurvived: Number(hoursSurvived) || 0,
      resources: resources || { power: 0, oxygen: 0, shielding: 0, morale: 0 },
    });

    return NextResponse.json({ success: true, ...details });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to advance tournament match';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
