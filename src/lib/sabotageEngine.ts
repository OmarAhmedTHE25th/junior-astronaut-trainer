// ─── Junior Astronaut Mission Trainer – Sabotage & EW Engine ───
// Serverless Neon PostgreSQL database engine with in-memory fallback
// for real-time sabotage attacks and bot retaliations.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
  SabotageSlug,
  SabotageEvent,
  TriggerSabotageRequest,
  TriggerSabotageResponse,
  SABOTAGE_CATALOG,
} from './sabotageTypes';
import { deductPlayerCredits } from './marketplace';

declare global {
  // eslint-disable-next-line no-var
  var __jat_sabotage_schema_ready__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __jat_sabotage_memory_store__: Map<string, SabotageEvent> | undefined;
}

function getMemoryStore(): Map<string, SabotageEvent> {
  if (!globalThis.__jat_sabotage_memory_store__) {
    globalThis.__jat_sabotage_memory_store__ = new Map();
  }
  return globalThis.__jat_sabotage_memory_store__;
}

async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    const sql = neon(url);
    await ensureSabotageSchema(sql);
    return sql;
  } catch (err) {
    console.warn('[SabotageEngine] Neon database unavailable, using in-memory store:', err);
    return null;
  }
}

async function ensureSabotageSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_sabotage_schema_ready__) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sabotage_events (
        id VARCHAR(64) PRIMARY KEY,
        context_type VARCHAR(24) NOT NULL,
        context_id VARCHAR(64) NOT NULL,
        attacker_id TEXT NOT NULL,
        attacker_name TEXT NOT NULL,
        attacker_avatar TEXT,
        target_id TEXT NOT NULL,
        target_name TEXT,
        sabotage_slug VARCHAR(32) NOT NULL,
        payment_type VARCHAR(16) NOT NULL,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sabotage_target_status
      ON sabotage_events (target_id, status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sabotage_context
      ON sabotage_events (context_id);
    `;

    globalThis.__jat_sabotage_schema_ready__ = true;
  } catch (err) {
    console.error('[SabotageEngine] Failed to create sabotage schema:', err);
    throw err;
  }
}

/**
 * 1. Trigger Sabotage Operation
 */
export async function triggerSabotage(
  req: TriggerSabotageRequest
): Promise<TriggerSabotageResponse> {
  const def = SABOTAGE_CATALOG[req.sabotageSlug];
  if (!def) {
    return { success: false, error: `Invalid sabotage slug: ${req.sabotageSlug}` };
  }

  let remainingCredits: number | undefined;
  let powerDeduction: number | undefined;

  // Validate & handle payment
  if (req.paymentType === 'mc') {
    try {
      const deduction = await deductPlayerCredits(req.attackerId, def.mcCost);
      remainingCredits = deduction.remainingCredits;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credit deduction failed';
      return { success: false, error: msg };
    }
  } else {
    powerDeduction = def.powerCost;
  }

  const eventId = `sab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = new Date().toISOString();

  const payload = {
    powerCost: def.powerCost,
    mcCost: def.mcCost,
    stolenO2: req.sabotageSlug === 'supply-intercept' ? 12 : undefined,
    stolenPower: req.sabotageSlug === 'supply-intercept' ? 10 : undefined,
    damage: req.sabotageSlug === 'solar-blind' && req.contextType === 'battle_royale' ? 15 : undefined,
  };

  const newEvent: SabotageEvent = {
    id: eventId,
    contextType: req.contextType,
    contextId: req.contextId,
    attackerId: req.attackerId,
    attackerName: req.attackerName,
    attackerAvatar: req.attackerAvatar || '👨‍🚀',
    targetId: req.targetId,
    targetName: req.targetName || 'Rival Commander',
    sabotageSlug: req.sabotageSlug,
    paymentType: req.paymentType,
    payloadJson: payload,
    status: 'pending',
    createdAt: nowIso,
  };

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      INSERT INTO sabotage_events (
        id, context_type, context_id, attacker_id, attacker_name,
        attacker_avatar, target_id, target_name, sabotage_slug,
        payment_type, payload_json, status, created_at
      ) VALUES (
        ${newEvent.id}, ${newEvent.contextType}, ${newEvent.contextId},
        ${newEvent.attackerId}, ${newEvent.attackerName}, ${newEvent.attackerAvatar},
        ${newEvent.targetId}, ${newEvent.targetName}, ${newEvent.sabotageSlug},
        ${newEvent.paymentType}, ${JSON.stringify(newEvent.payloadJson)},
        ${newEvent.status}, NOW()
      );
    `;
  } else {
    getMemoryStore().set(newEvent.id, newEvent);
  }

  // ── AI Bot Counter-Sabotage Logic ──
  // Bots have a 25% chance per Sol past Sol 10 to launch retaliatory sabotage against the player
  let counterAttack: SabotageEvent | null = null;
  const currentSol = req.currentSol || 1;
  const shouldBotRetaliate =
    req.isBotTarget &&
    (currentSol >= 10 ? Math.random() < 0.35 : Math.random() < 0.20);

  if (shouldBotRetaliate) {
    const counterSlugs: SabotageSlug[] = ['emp-jam', 'supply-intercept', 'comms-spoof', 'solar-blind'];
    const chosenSlug = counterSlugs[Math.floor(Math.random() * counterSlugs.length)];
    const counterDef = SABOTAGE_CATALOG[chosenSlug];
    const counterEventId = `sab_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    counterAttack = {
      id: counterEventId,
      contextType: req.contextType,
      contextId: req.contextId,
      attackerId: req.targetId,
      attackerName: req.targetName || 'Ghost Rival AI',
      attackerAvatar: '🤖',
      targetId: req.attackerId,
      targetName: req.attackerName,
      sabotageSlug: chosenSlug,
      paymentType: 'power',
      payloadJson: {
        powerCost: counterDef.powerCost,
        mcCost: counterDef.mcCost,
        stolenO2: chosenSlug === 'supply-intercept' ? 12 : undefined,
        stolenPower: chosenSlug === 'supply-intercept' ? 10 : undefined,
        damage: chosenSlug === 'solar-blind' && req.contextType === 'battle_royale' ? 15 : undefined,
        customNote: 'Retaliatory Electronic Warfare Counter-Strike',
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (sql) {
      await sql`
        INSERT INTO sabotage_events (
          id, context_type, context_id, attacker_id, attacker_name,
          attacker_avatar, target_id, target_name, sabotage_slug,
          payment_type, payload_json, status, created_at
        ) VALUES (
          ${counterAttack.id}, ${counterAttack.contextType}, ${counterAttack.contextId},
          ${counterAttack.attackerId}, ${counterAttack.attackerName}, ${counterAttack.attackerAvatar},
          ${counterAttack.targetId}, ${counterAttack.targetName}, ${counterAttack.sabotageSlug},
          ${counterAttack.paymentType}, ${JSON.stringify(counterAttack.payloadJson)},
          ${counterAttack.status}, NOW()
        );
      `;
    } else {
      getMemoryStore().set(counterAttack.id, counterAttack);
    }
  }

  return {
    success: true,
    event: newEvent,
    counterAttack,
    remainingCredits,
    powerDeduction,
  };
}

/**
 * 2. Poll & Atomically Apply Pending Sabotage Attacks for a Target Player
 */
export async function pollPendingSabotage(
  targetId: string,
  contextId?: string
): Promise<SabotageEvent[]> {
  const sql = await getSqlClient();

  if (sql) {
    let rows;
    if (contextId) {
      rows = await sql`
        UPDATE sabotage_events
        SET status = 'applied'
        WHERE target_id = ${targetId} AND context_id = ${contextId} AND status = 'pending'
        RETURNING *;
      `;
    } else {
      rows = await sql`
        UPDATE sabotage_events
        SET status = 'applied'
        WHERE target_id = ${targetId} AND status = 'pending'
        RETURNING *;
      `;
    }

    if (!rows || rows.length === 0) return [];

    return rows.map((r) => ({
      id: r.id,
      contextType: r.context_type as SabotageEvent['contextType'],
      contextId: r.context_id,
      attackerId: r.attacker_id,
      attackerName: r.attacker_name,
      attackerAvatar: r.attacker_avatar,
      targetId: r.target_id,
      targetName: r.target_name,
      sabotageSlug: r.sabotage_slug as SabotageSlug,
      paymentType: r.payment_type as SabotageEvent['paymentType'],
      payloadJson: typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json,
      status: 'applied' as const,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  }

  // Memory store fallback
  const mem = getMemoryStore();
  const matched: SabotageEvent[] = [];

  for (const [id, event] of mem.entries()) {
    if (event.targetId === targetId && event.status === 'pending') {
      if (!contextId || event.contextId === contextId) {
        event.status = 'applied';
        matched.push({ ...event });
        mem.set(id, event);
      }
    }
  }

  return matched;
}
