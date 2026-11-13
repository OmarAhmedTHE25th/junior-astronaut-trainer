// ─── Cloud Auto-Save API Route Handler ───

import { NextRequest, NextResponse } from 'next/server';
import { getActiveMission, saveActiveMission, deleteActiveMission } from '@/lib/storageAdapter';
import type { GameState } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cadetId = searchParams.get('cadetId');

    if (!cadetId) {
      return NextResponse.json({ success: false, error: 'Missing cadetId' }, { status: 400 });
    }

    const save = await getActiveMission(cadetId);
    return NextResponse.json({ success: true, save });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch save' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cadetId, state } = body as { cadetId?: string; state?: GameState };

    if (!cadetId || !state) {
      return NextResponse.json({ success: false, error: 'Missing cadetId or state' }, { status: 400 });
    }

    await saveActiveMission(cadetId, state);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to auto-save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cadetId = searchParams.get('cadetId');

    if (!cadetId) {
      return NextResponse.json({ success: false, error: 'Missing cadetId' }, { status: 400 });
    }

    await deleteActiveMission(cadetId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete save' }, { status: 500 });
  }
}
