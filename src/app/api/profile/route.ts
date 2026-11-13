// ─── Cadet Profile API Route Handler ───
// Neon Serverless Postgres backed with local in-memory fallback.

import { NextRequest, NextResponse } from 'next/server';
import { getCloudProfile, saveCloudProfile, isNeonConfigured } from '@/lib/storageAdapter';
import type { CadetProfile } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cadetId = searchParams.get('cadetId');

    if (!cadetId) {
      return NextResponse.json({ success: false, error: 'Missing cadetId' }, { status: 400 });
    }

    const profile = await getCloudProfile(cadetId);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile,
      isCloud: isNeonConfigured(),
    });
  } catch (err) {
    console.error('Error fetching cadet profile:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch cadet profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile } = body as { profile?: CadetProfile };

    if (!profile || !profile.cadetId || !profile.callsign) {
      return NextResponse.json({ success: false, error: 'Invalid profile payload' }, { status: 400 });
    }

    await saveCloudProfile(profile);

    return NextResponse.json({
      success: true,
      profile,
      isCloud: isNeonConfigured(),
    });
  } catch (err) {
    console.error('Error updating cadet profile:', err);
    return NextResponse.json({ success: false, error: 'Failed to save cadet profile' }, { status: 500 });
  }
}
