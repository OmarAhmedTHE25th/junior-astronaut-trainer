// ─── Junior Astronaut Mission Trainer – Orbital Guilds API ───

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllGuilds,
  getGuildById,
  getGuildByCadetId,
  createGuild,
  joinGuild,
  leaveGuild,
  donateToGuild,
  contributeScoreToGuild,
} from '@/lib/guildStorage';
import { GUILD_CREATION_FEE_MC, validateGuildName, validateGuildTag } from '@/lib/guildTypes';
import { deductPlayerCredits, getPlayerWallet } from '@/lib/marketplace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cadetId = searchParams.get('cadetId');

    const guilds = await getAllGuilds();
    const currentGuild = cadetId ? await getGuildByCadetId(cadetId) : null;

    return NextResponse.json({
      success: true,
      guilds,
      currentGuild,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query guilds';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action parameter' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        const {
          name,
          tag,
          emblem,
          motto,
          cadetId,
          callsign,
          avatar,
          isFiveStarGeneral,
        } = body;

        if (!cadetId || !callsign) {
          return NextResponse.json({ success: false, error: 'Missing cadet credentials' }, { status: 400 });
        }
        if (!validateGuildName(name || '')) {
          return NextResponse.json({ success: false, error: 'Guild name must be between 3 and 24 characters' }, { status: 400 });
        }
        if (!validateGuildTag(tag || '')) {
          return NextResponse.json({ success: false, error: 'Guild tag must be 2 to 4 uppercase alphanumeric characters' }, { status: 400 });
        }

        // Check if already in a guild
        const activeGuild = await getGuildByCadetId(cadetId);
        if (activeGuild) {
          return NextResponse.json({
            success: false,
            error: `You are already enlisted in [${activeGuild.tag}] ${activeGuild.name}. Leave your current guild first.`,
          }, { status: 400 });
        }

        // Check fee: Free for Five-Star Generals, otherwise 250 MC
        let remainingCredits: number | undefined = undefined;
        if (!isFiveStarGeneral) {
          const wallet = await getPlayerWallet(cadetId);
          if (wallet.creditsBalance < GUILD_CREATION_FEE_MC) {
            return NextResponse.json({
              success: false,
              error: `Insufficient Mars Credits to found a guild. Required: ${GUILD_CREATION_FEE_MC} MC (Balance: ${wallet.creditsBalance} MC).`,
            }, { status: 400 });
          }
          const deductRes = await deductPlayerCredits(cadetId, GUILD_CREATION_FEE_MC);
          remainingCredits = deductRes.remainingCredits;
        }

        const newGuild = await createGuild({
          name,
          tag,
          emblem: emblem || '🛡️',
          motto: motto || '',
          leaderId: cadetId,
          leaderCallsign: callsign,
          leaderAvatar: avatar || '👨‍🚀',
        });

        return NextResponse.json({
          success: true,
          guild: newGuild,
          remainingCredits,
        });
      }

      case 'join': {
        const { guildId, cadetId, callsign, avatar } = body;
        if (!guildId || !cadetId || !callsign) {
          return NextResponse.json({ success: false, error: 'Missing join parameters' }, { status: 400 });
        }

        const updatedGuild = await joinGuild(guildId, {
          cadetId,
          callsign,
          avatar: avatar || '👨‍🚀',
        });

        return NextResponse.json({
          success: true,
          guild: updatedGuild,
        });
      }

      case 'leave': {
        const { guildId, cadetId } = body;
        if (!guildId || !cadetId) {
          return NextResponse.json({ success: false, error: 'Missing guildId or cadetId' }, { status: 400 });
        }

        const result = await leaveGuild(guildId, cadetId);
        return NextResponse.json({
          success: true,
          disbanded: result.disbanded,
          newLeaderId: result.newLeaderId,
        });
      }

      case 'donate': {
        const { guildId, cadetId, amount } = body;
        const donateAmount = Number(amount);
        if (!guildId || !cadetId || isNaN(donateAmount) || donateAmount <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid donation amount' }, { status: 400 });
        }

        // Deduct from wallet first
        const deductResult = await deductPlayerCredits(cadetId, donateAmount);
        const { guild, member } = await donateToGuild(guildId, cadetId, donateAmount);

        return NextResponse.json({
          success: true,
          guild,
          member,
          remainingCredits: deductResult.remainingCredits,
        });
      }

      case 'contribute_score': {
        const { cadetId, score } = body;
        const numericScore = Number(score);
        if (!cadetId || isNaN(numericScore) || numericScore <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid score contribution' }, { status: 400 });
        }

        const guild = await contributeScoreToGuild(cadetId, numericScore);
        return NextResponse.json({
          success: true,
          guild,
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Guild transaction failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
