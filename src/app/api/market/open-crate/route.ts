// ─── Orbital Supply Drop Crates API Route Handler ───
// Weighted drop calculations, pity counter enforcement, and inventory fulfillment.

import { NextResponse } from 'next/server';
import {
  CRATE_TIERS,
  CATALOG_ITEMS,
  type CrateTierSlug,
  type RewardRarity,
  type CrateReward,
} from '@/lib/marketplaceTypes';
import {
  getPlayerWallet,
  executeStorePurchase,
  rewardPlayerCredits,
} from '@/lib/marketplace';

const COMMON_POOL = ['oxygen-canister', 'fuel-cell', 'hydroponic-rations'];
const RARE_POOL = ['rad-shielding', 'hull-plating', 'telemetry-decoy'];
const LEGENDARY_POOL = ['solar-concentrator', 'emergency-scrubber'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      playerId,
      crateSlug,
      pityCount = 0,
      isDailyFree = false,
      isFiveStarGeneral = false,
    } = body as {
      playerId?: string;
      crateSlug?: CrateTierSlug;
      pityCount?: number;
      isDailyFree?: boolean;
      isFiveStarGeneral?: boolean;
    };

    if (!playerId || !crateSlug) {
      return NextResponse.json(
        { success: false, error: 'playerId and crateSlug are required' },
        { status: 400 }
      );
    }

    const crateDef = CRATE_TIERS[crateSlug];
    if (!crateDef) {
      return NextResponse.json(
        { success: false, error: `Invalid crate tier: ${crateSlug}` },
        { status: 400 }
      );
    }

    // Check Daily Free validity
    const isFreeClaim = isDailyFree && crateSlug === 'sovereign' && isFiveStarGeneral;

    // Check & deduct Mars Credits if not free
    let currentWallet = await getPlayerWallet(playerId);
    const crateCost = isFreeClaim ? 0 : crateDef.costMC;

    if (crateCost > 0) {
      if (currentWallet.creditsBalance < crateCost) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient Galaxy Coins: required ${crateCost} GC, available ${currentWallet.creditsBalance} GC`,
          },
          { status: 400 }
        );
      }

      // Deduct cost (we do a net debit or charge full and return rebate)
      // Deduct crateCost via a purchase or direct wallet update
      // We can deduct crateCost by debiting wallet
      await executeStorePurchase({
        playerId,
        itemSlug: 'oxygen-canister', // dummy for wallet check/debit
        quantity: 1,
        isGrant: true,
      });
      // Direct debit using rewardPlayerCredits with negative amount or direct SQL
      const debitRes = await rewardPlayerCredits(playerId, -crateCost);
      currentWallet = { ...currentWallet, creditsBalance: debitRes.newBalance };
    }

    // Apply Elite Pod instant rebate if applicable
    let rebateApplied = 0;
    if (crateDef.rebateMC && crateDef.rebateMC > 0 && !isFreeClaim) {
      const rebateRes = await rewardPlayerCredits(playerId, crateDef.rebateMC);
      currentWallet = { ...currentWallet, creditsBalance: rebateRes.newBalance };
      rebateApplied = crateDef.rebateMC;
    }

    // ── Determine Rarity with Pity System ──
    // Every 5th open (pityCount >= 4) guarantees a Legendary
    let rarity: RewardRarity = 'common';
    let nextPity = pityCount;

    const isPityGuaranteed = pityCount >= 4;

    if (pityCount >= 4) {
      rarity = 'legendary';
      nextPity = 0;
    } else {
      const roll = Math.random();
      if (roll < crateDef.odds.legendary) {
        rarity = 'legendary';
        nextPity = 0;
      } else if (roll < crateDef.odds.legendary + crateDef.odds.rare) {
        rarity = 'rare';
        nextPity += 1;
      } else {
        rarity = 'common';
        nextPity += 1;
      }
    }

    // Double yield multiplier for Sovereign Vault
    const isSovereign = crateSlug === 'sovereign';
    const quantityMultiplier = isSovereign ? 2 : 1;

    let reward: CrateReward;

    if (rarity === 'legendary') {
      // 35% chance of Mars Credit Jackpot, 65% chance of Apex Tech Module
      const isJackpotRoll = Math.random() < 0.35;
      if (isJackpotRoll) {
        let jackpotCredits = 500;
        if (crateSlug === 'elite') jackpotCredits = 1000;
        if (crateSlug === 'sovereign') jackpotCredits = 2500;

        const jackpotRes = await rewardPlayerCredits(playerId, jackpotCredits);
        currentWallet = { ...currentWallet, creditsBalance: jackpotRes.newBalance };

        reward = {
          itemSlug: undefined,
          itemName: `${jackpotCredits} GC JACKPOT!`,
          name: `${jackpotCredits} GC JACKPOT!`,
          icon: '💎',
          quantity: 1,
          rarity: 'legendary',
          isJackpot: true,
          jackpotCredits,
          description: 'Instant telemetry high-yield Galaxy Coins jackpot credited directly to your outpost wallet.',
          isPityGuaranteed,
          rebateCredits: rebateApplied,
        };
      } else {
        const itemSlug = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)];
        const itemDef = CATALOG_ITEMS[itemSlug];
        const qty = 1 * quantityMultiplier;

        await executeStorePurchase({
          playerId,
          itemSlug,
          quantity: qty,
          isGrant: true,
        });

        reward = {
          itemSlug,
          itemName: itemDef.name,
          name: itemDef.name,
          icon: itemDef.icon,
          quantity: qty,
          rarity: 'legendary',
          description: itemDef.description,
          isPityGuaranteed,
          rebateCredits: rebateApplied,
        };
      }
    } else if (rarity === 'rare') {
      const itemSlug = RARE_POOL[Math.floor(Math.random() * RARE_POOL.length)];
      const itemDef = CATALOG_ITEMS[itemSlug];
      const qty = 1 * quantityMultiplier;

      await executeStorePurchase({
        playerId,
        itemSlug,
        quantity: qty,
        isGrant: true,
      });

      reward = {
        itemSlug,
        itemName: itemDef.name,
        name: itemDef.name,
        icon: itemDef.icon,
        quantity: qty,
        rarity: 'rare',
        description: itemDef.description,
        isPityGuaranteed,
        rebateCredits: rebateApplied,
      };
    } else {
      const itemSlug = COMMON_POOL[Math.floor(Math.random() * COMMON_POOL.length)];
      const itemDef = CATALOG_ITEMS[itemSlug];
      const qty = Math.floor(1 + Math.random() * 2) * quantityMultiplier;

      await executeStorePurchase({
        playerId,
        itemSlug,
        quantity: qty,
        isGrant: true,
      });

      reward = {
        itemSlug,
        itemName: itemDef.name,
        name: itemDef.name,
        icon: itemDef.icon,
        quantity: qty,
        rarity: 'common',
        description: itemDef.description,
        isPityGuaranteed,
        rebateCredits: rebateApplied,
      };
    }

    return NextResponse.json({
      success: true,
      reward,
      rarity,
      newBalance: currentWallet.creditsBalance,
      pityCount: nextPity,
      rebateApplied,
    });
  } catch (err) {
    console.error('Error opening orbital crate:', err);
    const message = err instanceof Error ? err.message : 'Failed to open orbital crate';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
