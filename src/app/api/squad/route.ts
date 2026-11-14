import { NextRequest, NextResponse } from 'next/server';
import {
  createSquadRoom,
  joinSquadRoom,
  startSquadRoom,
  syncSquadCadet,
  getSquadRoom,
} from '@/lib/storageAdapter';
import type { LandingSiteId, SquadCadetState } from '@/lib/types';

// Generate clean, unambiguous 6-character room codes (no 0/O, 1/I)
function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      case 'CREATE': {
        const landingZone: LandingSiteId = body.landingZone || 'jezero';
        const weatherSeed: number =
          typeof body.weatherSeed === 'number'
            ? body.weatherSeed
            : Math.floor(Math.random() * 899999) + 100000;

        const rawCadet = body.cadet || {};
        const hostCadet: SquadCadetState = {
          cadetId: rawCadet.cadetId || `cadet-${Date.now()}`,
          callsign: (rawCadet.callsign || 'CDR-ALPHA').toUpperCase().slice(0, 16),
          avatar: rawCadet.avatar || '👨‍🚀',
          specialty: rawCadet.specialty || 'commander',
          sol: 1,
          power: 80,
          oxygen: 85,
          shielding: 70,
          morale: 75,
          score: 0,
          alive: true,
          updatedAt: Date.now(),
        };

        let roomCode = generateRoomCode();
        // Check collision just in case
        let existing = await getSquadRoom(roomCode);
        let retries = 3;
        while (existing && retries > 0) {
          roomCode = generateRoomCode();
          existing = await getSquadRoom(roomCode);
          retries--;
        }

        const isTimedMode = Boolean(body.isTimedMode);

        const room = await createSquadRoom(roomCode, landingZone, weatherSeed, hostCadet, isTimedMode);
        if (!room) {
          return NextResponse.json(
            { success: false, error: 'Failed to create squad room' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, room });
      }

      case 'JOIN': {
        const { roomCode, cadet } = body;
        if (!roomCode) {
          return NextResponse.json({ success: false, error: 'Missing room code' }, { status: 400 });
        }

        const cadetState: SquadCadetState = {
          cadetId: cadet?.cadetId || `cadet-${Date.now()}`,
          callsign: (cadet?.callsign || 'CADET-SQUAD').toUpperCase().slice(0, 16),
          avatar: cadet?.avatar || '🚀',
          specialty: cadet?.specialty || 'commander',
          sol: 1,
          power: 80,
          oxygen: 85,
          shielding: 70,
          morale: 75,
          score: 0,
          alive: true,
          updatedAt: Date.now(),
        };

        const res = await joinSquadRoom(roomCode, cadetState);
        if (!res.room) {
          return NextResponse.json(
            { success: false, error: res.error || 'Failed to join squad' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true, room: res.room });
      }

      case 'START': {
        const { roomCode } = body;
        if (!roomCode) {
          return NextResponse.json({ success: false, error: 'Missing room code' }, { status: 400 });
        }

        const room = await startSquadRoom(roomCode);
        if (!room) {
          return NextResponse.json(
            { success: false, error: 'Squad room not found or cannot be launched' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, room });
      }

      case 'SYNC': {
        const { roomCode, cadet } = body;
        if (!roomCode || !cadet) {
          return NextResponse.json(
            { success: false, error: 'Missing room code or cadet state' },
            { status: 400 }
          );
        }

        const cadetState: SquadCadetState = {
          cadetId: cadet.cadetId,
          callsign: cadet.callsign || 'ASTRONAUT',
          avatar: cadet.avatar || '🚀',
          specialty: cadet.specialty || 'commander',
          sol: typeof cadet.sol === 'number' ? cadet.sol : 1,
          power: typeof cadet.power === 'number' ? cadet.power : 80,
          oxygen: typeof cadet.oxygen === 'number' ? cadet.oxygen : 85,
          shielding: typeof cadet.shielding === 'number' ? cadet.shielding : 70,
          morale: typeof cadet.morale === 'number' ? cadet.morale : 75,
          score: typeof cadet.score === 'number' ? cadet.score : 0,
          alive: cadet.alive !== false,
          updatedAt: Date.now(),
        };

        const room = await syncSquadCadet(roomCode, cadetState);
        if (!room) {
          return NextResponse.json(
            { success: false, error: 'Squad room not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, room });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error('API /api/squad error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const room = await getSquadRoom(code);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Squad room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, room });
  } catch (err: unknown) {
    console.error('API /api/squad GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
