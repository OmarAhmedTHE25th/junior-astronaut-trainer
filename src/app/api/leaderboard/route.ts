// ─── Global Leaderboard API Route Handler ───
// Server-side anti-cheat score validation using pure gameEngine functions.

import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, saveLeaderboardEntry, deleteActiveMission } from '@/lib/storageAdapter';
import { calculateScore, checkVictory } from '@/lib/gameEngine';
import type { GameState, LeaderboardEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty') || 'all';
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const result = await getLeaderboard(difficulty, Math.min(limit, 50));
    return NextResponse.json({
      success: true,
      entries: result.entries,
      isCloudStorage: result.isCloudStorage,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cadetId, callsign, avatar, finalState, badgesCount } = body as {
      cadetId?: string;
      callsign?: string;
      avatar?: string;
      finalState?: GameState;
      badgesCount?: number;
    };

    if (!cadetId || !callsign || !finalState) {
      return NextResponse.json(
        { success: false, error: 'Missing required run telemetry fields' },
        { status: 400 }
      );
    }

    // ── Anti-Cheat Server-Side Calculation ─────────────────
    // Run the authoritative pure scoring function directly on the server
    const authoritativeScore = calculateScore(finalState);
    const isVerifiedVictory = checkVictory(finalState);

    const entry: LeaderboardEntry = {
      cadetId,
      callsign: callsign.trim().toUpperCase().substring(0, 16),
      avatar: avatar || '🚀',
      difficulty: finalState.difficulty || 'commander',
      solsSurvived: Math.min(finalState.sol, 30),
      score: authoritativeScore,
      badgesCount: typeof badgesCount === 'number' ? badgesCount : 0,
      timestamp: Date.now(),
      verified: true,
    };

    const saveResult = await saveLeaderboardEntry(entry);

    // Clean up active save slot since this mission is concluded
    await deleteActiveMission(cadetId);

    return NextResponse.json({
      success: true,
      rank: saveResult.rank,
      score: authoritativeScore,
      isVictory: isVerifiedVictory,
      isCloudStorage: saveResult.isCloudStorage,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit score to leaderboard' },
      { status: 500 }
    );
  }
}
