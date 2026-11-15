import { NextResponse } from 'next/server';
import { getTournamentDetails } from '@/lib/tournamentEngine';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Tournament ID is required' }, { status: 400 });
    }

    const details = await getTournamentDetails(id);
    return NextResponse.json({ success: true, ...details });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tournament not found';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
