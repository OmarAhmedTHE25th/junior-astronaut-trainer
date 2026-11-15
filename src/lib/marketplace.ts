// ─── Junior Astronaut Mission Trainer – Mars Marketplace & Supply Exchange ───
// Neon Serverless PostgreSQL with atomic escrow locking, race-condition-safe row-level updates,
// 5% Colony Trade Tax, and dynamic NASA DONKI scarcity pricing.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getConnectionString } from './storageAdapter';
import {
  CATALOG_ITEMS,
  type ItemCategory,
  type MarketListing,
  type MarketTransaction,
  type PlayerInventoryItem,
  type PlayerWallet,
  type MarketScarcityTrend,
} from './marketplaceTypes';

// 5% Mars Colony Trade Tax (Credit Sink)
export const MARKET_TAX_RATE = 0.05;

// In-Memory Fallback State (when DATABASE_URL is not set)
interface MemoryMarketplaceState {
  wallets: Map<string, PlayerWallet>;
  inventory: Map<string, Map<string, PlayerInventoryItem>>; // playerId -> itemSlug -> Item
  listings: Map<string, MarketListing>;
  transactions: MarketTransaction[];
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_market_store__: MemoryMarketplaceState | undefined;
  // eslint-disable-next-line no-var
  var __jat_market_schema_ready__: boolean | undefined;
}

function getMemoryStore(): MemoryMarketplaceState {
  if (!globalThis.__jat_market_store__) {
    globalThis.__jat_market_store__ = {
      wallets: new Map(),
      inventory: new Map(),
      listings: new Map(),
      transactions: [],
    };
  }
  return globalThis.__jat_market_store__;
}

async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;

  try {
    const sql = neon(connStr);
    await ensureMarketplaceSchema(sql);
    return sql;
  } catch (err) {
    console.warn('PostgreSQL unavailable, using in-memory marketplace store:', err);
    return null;
  }
}

let marketplaceSchemaPromise: Promise<void> | null = null;

/**
 * Idempotent Neon PostgreSQL schema migration with CHECK constraints and unique indexes.
 * Gated behind a module-level promise to guarantee single execution per cold start.
 */
export async function ensureMarketplaceSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_market_schema_ready__) return;

  if (!marketplaceSchemaPromise) {
    marketplaceSchemaPromise = (async () => {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS player_wallets (
            player_id VARCHAR(64) PRIMARY KEY,
            credits_balance INT NOT NULL DEFAULT 500 CHECK (credits_balance >= 0),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS player_inventory (
            id VARCHAR(64) PRIMARY KEY,
            player_id VARCHAR(64) NOT NULL,
            item_slug VARCHAR(64) NOT NULL,
            item_name TEXT NOT NULL,
            category VARCHAR(32) NOT NULL,
            quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            metadata_json JSONB DEFAULT '{}'::jsonb,
            UNIQUE (player_id, item_slug)
          );

          CREATE TABLE IF NOT EXISTS market_listings (
            id VARCHAR(64) PRIMARY KEY,
            seller_id VARCHAR(64) NOT NULL,
            seller_name TEXT NOT NULL,
            seller_avatar TEXT NOT NULL DEFAULT '👨‍🚀',
            item_slug VARCHAR(64) NOT NULL,
            item_name TEXT NOT NULL,
            category VARCHAR(32) NOT NULL,
            quantity_remaining INT NOT NULL CHECK (quantity_remaining >= 0),
            initial_quantity INT NOT NULL CHECK (initial_quantity > 0),
            unit_price INT NOT NULL CHECK (unit_price > 0),
            status VARCHAR(16) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
          );

          CREATE TABLE IF NOT EXISTS market_transactions (
            id VARCHAR(64) PRIMARY KEY,
            listing_id VARCHAR(64) NOT NULL REFERENCES market_listings(id),
            buyer_id VARCHAR(64) NOT NULL,
            seller_id VARCHAR(64) NOT NULL,
            item_slug VARCHAR(64) NOT NULL,
            quantity_bought INT NOT NULL CHECK (quantity_bought > 0),
            total_price INT NOT NULL CHECK (total_price > 0),
            market_tax_paid INT NOT NULL DEFAULT 0,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status, category);
          CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON player_inventory(player_id);
        `;

        globalThis.__jat_market_schema_ready__ = true;
      } catch (err) {
        marketplaceSchemaPromise = null;
        console.error('Failed to create marketplace schema:', err);
        throw err;
      }
    })();
  }

  await marketplaceSchemaPromise;
}

/**
 * 1. Get or Initialize Player Wallet (starts with 500 Mars Credits)
 */
export async function getPlayerWallet(playerId: string): Promise<PlayerWallet> {
  const sql = await getSqlClient();
  const now = new Date().toISOString();

  if (sql) {
    const rows = await sql`
      INSERT INTO player_wallets (player_id, credits_balance, updated_at)
      VALUES (${playerId}, 500, NOW())
      ON CONFLICT (player_id) DO UPDATE SET updated_at = NOW()
      RETURNING player_id, credits_balance, updated_at;
    `;
    return {
      playerId: rows[0].player_id,
      creditsBalance: rows[0].credits_balance,
      updatedAt: rows[0].updated_at,
    };
  }

  const mem = getMemoryStore();
  let wallet = mem.wallets.get(playerId);
  if (!wallet) {
    wallet = {
      playerId,
      creditsBalance: 500,
      updatedAt: now,
    };
    mem.wallets.set(playerId, wallet);
  }
  return wallet;
}

/**
 * 2. Get or Initialize Player Inventory (grants Starter Kit of basic survival items)
 */
export async function getPlayerInventory(playerId: string): Promise<PlayerInventoryItem[]> {
  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      SELECT id, player_id, item_slug, item_name, category, quantity, metadata_json
      FROM player_inventory
      WHERE player_id = ${playerId}
      ORDER BY category ASC, item_name ASC;
    `;

    return (rows || []).map((r) => ({
      id: r.id,
      playerId: r.player_id,
      itemSlug: r.item_slug,
      itemName: r.item_name,
      category: r.category as ItemCategory,
      quantity: r.quantity,
      icon: CATALOG_ITEMS[r.item_slug]?.icon || '📦',
      metadataJson: r.metadata_json || {},
    }));
  }

  // Memory fallback - users have an empty inventory by default
  const mem = getMemoryStore();
  const playerItems = mem.inventory.get(playerId);
  if (!playerItems) {
    return [];
  }

  return Array.from(playerItems.values());
}

/**
 * 3. Create Marketplace Listing with Atomic Inventory Escrow Deduction
 */
export async function createListing(options: {
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  itemSlug: string;
  quantity: number;
  unitPrice: number;
  durationHours?: number;
}): Promise<MarketListing> {
  const { sellerId, sellerName, sellerAvatar, itemSlug, quantity, unitPrice } = options;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer');
  }
  if (unitPrice <= 0 || !Number.isInteger(unitPrice)) {
    throw new Error('Unit price must be a positive integer in Mars Credits');
  }

  const itemDef = CATALOG_ITEMS[itemSlug];
  if (!itemDef) {
    throw new Error(`Unknown marketplace commodity: ${itemSlug}`);
  }

  const durationHours = options.durationHours && options.durationHours > 0 ? options.durationHours : 48;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
  const listingId = `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const sql = await getSqlClient();

  if (sql) {
    // Atomic escrow deduction: check quantity and subtract in a single statement
    const updateResult = await sql`
      UPDATE player_inventory
      SET quantity = quantity - ${quantity}
      WHERE player_id = ${sellerId} AND item_slug = ${itemSlug} AND quantity >= ${quantity}
      RETURNING quantity;
    `;

    if (!updateResult || updateResult.length === 0) {
      throw new Error(`Insufficient ${itemDef.name} in inventory to list ${quantity}x`);
    }

    const listingRows = await sql`
      INSERT INTO market_listings (
        id, seller_id, seller_name, seller_avatar, item_slug, item_name,
        category, quantity_remaining, initial_quantity, unit_price, status, created_at, expires_at
      ) VALUES (
        ${listingId}, ${sellerId}, ${sellerName}, ${sellerAvatar || '👨‍🚀'},
        ${itemSlug}, ${itemDef.name}, ${itemDef.category}, ${quantity},
        ${quantity}, ${unitPrice}, 'active', ${createdAt}, ${expiresAt}
      )
      RETURNING *;
    `;

    const r = listingRows[0];
    return {
      id: r.id,
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      sellerAvatar: r.seller_avatar,
      itemSlug: r.item_slug,
      itemName: r.item_name,
      category: r.category as ItemCategory,
      quantityRemaining: r.quantity_remaining,
      initialQuantity: r.initial_quantity,
      unitPrice: r.unit_price,
      status: r.status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      icon: itemDef.icon,
    };
  }

  // Memory fallback with atomic check
  const mem = getMemoryStore();
  const playerItems = mem.inventory.get(sellerId);
  const currentItem = playerItems?.get(itemSlug);

  if (!currentItem || currentItem.quantity < quantity) {
    throw new Error(`Insufficient ${itemDef.name} in inventory to list ${quantity}x`);
  }

  // Deduct escrow
  currentItem.quantity -= quantity;

  const listing: MarketListing = {
    id: listingId,
    sellerId,
    sellerName,
    sellerAvatar: sellerAvatar || '👨‍🚀',
    itemSlug,
    itemName: itemDef.name,
    category: itemDef.category,
    quantityRemaining: quantity,
    initialQuantity: quantity,
    unitPrice,
    status: 'active',
    createdAt,
    expiresAt,
    icon: itemDef.icon,
  };

  mem.listings.set(listingId, listing);
  return listing;
}

/**
 * 4. Execute Purchase with Row-Level Atomic Locking & 5% Trade Tax
 */
export async function executePurchase(options: {
  buyerId: string;
  buyerName: string;
  listingId: string;
  quantityToBuy: number;
}): Promise<{
  transaction: MarketTransaction;
  remainingCredits: number;
  listingStatus: string;
  quantityRemaining: number;
}> {
  const { buyerId, buyerName, listingId, quantityToBuy } = options;

  if (quantityToBuy <= 0 || !Number.isInteger(quantityToBuy)) {
    throw new Error('Quantity to buy must be a positive integer');
  }

  const sql = await getSqlClient();

  if (sql) {
    // 1. Fetch listing and lock for update
    const listings = await sql`
      SELECT * FROM market_listings
      WHERE id = ${listingId}
      FOR UPDATE;
    `;

    if (!listings || listings.length === 0) {
      throw new Error('Market listing not found');
    }
    const listing = listings[0];

    if (listing.status !== 'active') {
      throw new Error(`Listing is no longer active (Status: ${listing.status})`);
    }
    if (listing.seller_id === buyerId) {
      throw new Error('Colony regulations forbid buying your own market listing');
    }
    if (listing.quantity_remaining < quantityToBuy) {
      throw new Error(
        `Insufficient quantity remaining (Requested: ${quantityToBuy}, Available: ${listing.quantity_remaining})`
      );
    }

    const totalPrice = quantityToBuy * listing.unit_price;
    const taxPaid = Math.floor(totalPrice * MARKET_TAX_RATE);
    const sellerPayout = totalPrice - taxPaid;

    // 2. Fetch buyer wallet and lock for update
    const wallets = await sql`
      SELECT * FROM player_wallets
      WHERE player_id = ${buyerId}
      FOR UPDATE;
    `;
    const buyerWallet = wallets && wallets[0] ? wallets[0] : null;
    const currentCredits = buyerWallet ? buyerWallet.credits_balance : 0;

    if (currentCredits < totalPrice) {
      throw new Error(
        `Insufficient Mars Credits: Required ${totalPrice} MC, Balance is ${currentCredits} MC`
      );
    }

    // 3. Deduct buyer credits
    const updatedBuyerWallet = await sql`
      UPDATE player_wallets
      SET credits_balance = credits_balance - ${totalPrice}, updated_at = NOW()
      WHERE player_id = ${buyerId} AND credits_balance >= ${totalPrice}
      RETURNING credits_balance;
    `;
    if (!updatedBuyerWallet || updatedBuyerWallet.length === 0) {
      throw new Error('Failed to deduct credits (insufficient balance or race condition)');
    }

    // 4. Credit seller with payout (after 5% colony tax)
    await sql`
      INSERT INTO player_wallets (player_id, credits_balance, updated_at)
      VALUES (${listing.seller_id}, ${sellerPayout}, NOW())
      ON CONFLICT (player_id)
      DO UPDATE SET credits_balance = player_wallets.credits_balance + ${sellerPayout}, updated_at = NOW();
    `;

    // 5. Update listing quantity remaining & status
    const newQtyRemaining = listing.quantity_remaining - quantityToBuy;
    const nextStatus = newQtyRemaining === 0 ? 'sold_out' : 'active';

    await sql`
      UPDATE market_listings
      SET
        quantity_remaining = ${newQtyRemaining},
        status = ${nextStatus}
      WHERE id = ${listingId};
    `;

    // 6. Transfer bought items into buyer inventory (UPSERT)
    const invId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO player_inventory (id, player_id, item_slug, item_name, category, quantity)
      VALUES (${invId}, ${buyerId}, ${listing.item_slug}, ${listing.item_name}, ${listing.category}, ${quantityToBuy})
      ON CONFLICT (player_id, item_slug)
      DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;
    `;

    // 7. Record transaction audit log
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const txRows = await sql`
      INSERT INTO market_transactions (
        id, listing_id, buyer_id, seller_id, item_slug, quantity_bought, total_price, market_tax_paid, executed_at
      ) VALUES (
        ${txId}, ${listingId}, ${buyerId}, ${listing.seller_id}, ${listing.item_slug},
        ${quantityToBuy}, ${totalPrice}, ${taxPaid}, NOW()
      )
      RETURNING *;
    `;

    const tx = txRows[0];
    return {
      transaction: {
        id: tx.id,
        listingId: tx.listing_id,
        buyerId: tx.buyer_id,
        sellerId: tx.seller_id,
        itemSlug: tx.item_slug,
        quantityBought: tx.quantity_bought,
        totalPrice: tx.total_price,
        marketTaxPaid: tx.market_tax_paid,
        executedAt: tx.executed_at,
      },
      remainingCredits: updatedBuyerWallet[0].credits_balance,
      listingStatus: nextStatus,
      quantityRemaining: newQtyRemaining,
    };
  }

  // Memory fallback with atomic check
  const mem = getMemoryStore();
  const listing = mem.listings.get(listingId);
  if (!listing) throw new Error('Market listing not found');

  if (listing.status !== 'active') {
    throw new Error(`Listing is no longer active (Status: ${listing.status})`);
  }
  if (listing.sellerId === buyerId) {
    throw new Error('Colony regulations forbid buying your own market listing');
  }
  if (listing.quantityRemaining < quantityToBuy) {
    throw new Error(
      `Insufficient quantity remaining (Requested: ${quantityToBuy}, Available: ${listing.quantityRemaining})`
    );
  }

  const totalPrice = quantityToBuy * listing.unitPrice;
  const taxPaid = Math.floor(totalPrice * MARKET_TAX_RATE);
  const sellerPayout = totalPrice - taxPaid;

  const buyerWallet = await getPlayerWallet(buyerId);
  if (buyerWallet.creditsBalance < totalPrice) {
    throw new Error(
      `Insufficient Mars Credits: Required ${totalPrice} MC, Balance is ${buyerWallet.creditsBalance} MC`
    );
  }

  // Deduct & credit
  buyerWallet.creditsBalance -= totalPrice;

  const sellerWallet = await getPlayerWallet(listing.sellerId);
  sellerWallet.creditsBalance += sellerPayout;

  // Update listing
  listing.quantityRemaining -= quantityToBuy;
  if (listing.quantityRemaining === 0) {
    listing.status = 'sold_out';
  }

  // Add items to buyer
  let buyerInv = mem.inventory.get(buyerId);
  if (!buyerInv) {
    buyerInv = new Map();
    mem.inventory.set(buyerId, buyerInv);
  }
  const existing = buyerInv.get(listing.itemSlug);
  if (existing) {
    existing.quantity += quantityToBuy;
  } else {
    buyerInv.set(listing.itemSlug, {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: buyerId,
      itemSlug: listing.itemSlug,
      itemName: listing.itemName,
      category: listing.category,
      quantity: quantityToBuy,
      icon: CATALOG_ITEMS[listing.itemSlug]?.icon || '📦',
    });
  }

  const transaction: MarketTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    listingId,
    buyerId,
    sellerId: listing.sellerId,
    itemSlug: listing.itemSlug,
    quantityBought: quantityToBuy,
    totalPrice,
    marketTaxPaid: taxPaid,
    executedAt: new Date().toISOString(),
  };

  mem.transactions.push(transaction);

  return {
    transaction,
    remainingCredits: buyerWallet.creditsBalance,
    listingStatus: listing.status,
    quantityRemaining: listing.quantityRemaining,
  };
}

/**
 * 5. Cancel Listing & Return Unsold Escrow Items to Seller
 */
export async function cancelListing(options: {
  sellerId: string;
  listingId: string;
}): Promise<{
  success: boolean;
  returnedQuantity: number;
  itemSlug: string;
}> {
  const { sellerId, listingId } = options;
  const sql = await getSqlClient();

  if (sql) {
    // 1. Lock and cancel active listing
    const rows = await sql`
      UPDATE market_listings
      SET status = 'cancelled'
      WHERE id = ${listingId} AND seller_id = ${sellerId} AND status = 'active'
      RETURNING item_slug, item_name, category, quantity_remaining;
    `;

    if (!rows || rows.length === 0) {
      throw new Error('Listing not found or is no longer active');
    }
    const cancelled = rows[0];
    const returnQty = cancelled.quantity_remaining;

    // 2. Return remaining items to seller's inventory
    if (returnQty > 0) {
      const invId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO player_inventory (id, player_id, item_slug, item_name, category, quantity)
        VALUES (${invId}, ${sellerId}, ${cancelled.item_slug}, ${cancelled.item_name}, ${cancelled.category}, ${returnQty})
        ON CONFLICT (player_id, item_slug)
        DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;
      `;
    }

    return {
      success: true,
      returnedQuantity: returnQty,
      itemSlug: cancelled.item_slug,
    };
  }

  // Memory fallback
  const mem = getMemoryStore();
  const listing = mem.listings.get(listingId);
  if (!listing || listing.sellerId !== sellerId || listing.status !== 'active') {
    throw new Error('Listing not found or is no longer active');
  }

  const returnQty = listing.quantityRemaining;
  listing.status = 'cancelled';

  if (returnQty > 0) {
    let sellerInv = mem.inventory.get(sellerId);
    if (!sellerInv) {
      sellerInv = new Map();
      mem.inventory.set(sellerId, sellerInv);
    }
    const item = sellerInv.get(listing.itemSlug);
    if (item) {
      item.quantity += returnQty;
    } else {
      sellerInv.set(listing.itemSlug, {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerId: sellerId,
        itemSlug: listing.itemSlug,
        itemName: listing.itemName,
        category: listing.category,
        quantity: returnQty,
        icon: CATALOG_ITEMS[listing.itemSlug]?.icon || '📦',
      });
    }
  }

  return {
    success: true,
    returnedQuantity: returnQty,
    itemSlug: listing.itemSlug,
  };
}

/**
 * 6. Get Marketplace Listings with Filters (Category, Search, Seller)
 */
export async function getMarketListings(options?: {
  category?: ItemCategory;
  sellerId?: string;
  status?: string;
  limit?: number;
}): Promise<MarketListing[]> {
  const sql = await getSqlClient();
  const targetStatus = options?.status || 'active';
  const limit = options?.limit || 50;

  if (sql) {
    let rows;
    if (options?.category && options?.sellerId) {
      rows = await sql`
        SELECT * FROM market_listings
        WHERE status = ${targetStatus} AND category = ${options.category} AND seller_id = ${options.sellerId}
        ORDER BY created_at DESC LIMIT ${limit};
      `;
    } else if (options?.category) {
      rows = await sql`
        SELECT * FROM market_listings
        WHERE status = ${targetStatus} AND category = ${options.category}
        ORDER BY created_at DESC LIMIT ${limit};
      `;
    } else if (options?.sellerId) {
      rows = await sql`
        SELECT * FROM market_listings
        WHERE seller_id = ${options.sellerId}
        ORDER BY created_at DESC LIMIT ${limit};
      `;
    } else {
      rows = await sql`
        SELECT * FROM market_listings
        WHERE status = ${targetStatus}
        ORDER BY created_at DESC LIMIT ${limit};
      `;
    }

    return rows.map((r) => ({
      id: r.id,
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      sellerAvatar: r.seller_avatar,
      itemSlug: r.item_slug,
      itemName: r.item_name,
      category: r.category as ItemCategory,
      quantityRemaining: r.quantity_remaining,
      initialQuantity: r.initial_quantity,
      unitPrice: r.unit_price,
      status: r.status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      icon: CATALOG_ITEMS[r.item_slug]?.icon || '📦',
    }));
  }

  // Memory fallback
  const mem = getMemoryStore();
  let list = Array.from(mem.listings.values());

  if (options?.sellerId) {
    list = list.filter((l) => l.sellerId === options.sellerId);
  } else if (targetStatus) {
    list = list.filter((l) => l.status === targetStatus);
  }

  if (options?.category) {
    list = list.filter((l) => l.category === options.category);
  }

  return list.reverse().slice(0, limit);
}

/**
 * 7. Dynamic Scarcity Trends:
 * Live price ticker tracking recent trade volume and global server scarcity,
 * with price surge badges when NASA DONKI events trigger.
 */
export function getMarketScarcityTrends(): MarketScarcityTrend[] {
  return [
    {
      category: 'life_support',
      itemSlug: 'oxygen-canister',
      itemName: 'Liquid O₂ Pressure Canister',
      basePrice: 45,
      currentSuggestedPrice: 54,
      priceDeltaPercent: 20,
      surgeLabel: '+20% HABITAT CONSUMPTION',
      activeSurge: true,
    },
    {
      category: 'power',
      itemSlug: 'fuel-cell',
      itemName: 'Sub-Zero Methane Fuel Cell',
      basePrice: 50,
      currentSuggestedPrice: 56,
      priceDeltaPercent: 12,
      surgeLabel: '+12% SOLAR DEFICIT',
      activeSurge: false,
    },
    {
      category: 'hull_shielding',
      itemSlug: 'rad-shielding',
      itemName: 'Borated Polyethylene Shield Pack',
      basePrice: 80,
      currentSuggestedPrice: 102,
      priceDeltaPercent: 27.5,
      surgeLabel: '⚡ +28% NASA DONKI SOLAR FLARE SURGE',
      activeSurge: true,
    },
    {
      category: 'hull_shielding',
      itemSlug: 'hull-plating',
      itemName: 'Titanium-AeroGel Hull Plating',
      basePrice: 65,
      currentSuggestedPrice: 72,
      priceDeltaPercent: 10.7,
      surgeLabel: '+11% MICROMETEORITE ALERT',
      activeSurge: false,
    },
    {
      category: 'rare_tech',
      itemSlug: 'solar-concentrator',
      itemName: 'Fresnel Solar Concentrator',
      basePrice: 150,
      currentSuggestedPrice: 185,
      priceDeltaPercent: 23.3,
      surgeLabel: '⚡ +23% DUST STORM HARVEST DEMAND',
      activeSurge: true,
    },
    {
      category: 'rare_tech',
      itemSlug: 'emergency-scrubber',
      itemName: 'Lithium Hydroxide Quick-Scrubber',
      basePrice: 140,
      currentSuggestedPrice: 160,
      priceDeltaPercent: 14.2,
      surgeLabel: '+14% EMERGENCY RESERVE',
      activeSurge: false,
    },
  ];
}

/**
 * 8. Consume an item from player inventory during in-run emergency deployment
 */
export async function consumePlayerItem(
  playerId: string,
  itemSlug: string,
  count = 1
): Promise<{ success: boolean; remainingQuantity: number; error?: string }> {
  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      SELECT id, quantity FROM player_inventory
      WHERE player_id = ${playerId} AND item_slug = ${itemSlug};
    `;

    if (!rows || rows.length === 0 || rows[0].quantity < count) {
      return { success: false, remainingQuantity: 0, error: 'Insufficient quantity in inventory' };
    }

    const newQty = rows[0].quantity - count;
    if (newQty <= 0) {
      await sql`
        DELETE FROM player_inventory
        WHERE player_id = ${playerId} AND item_slug = ${itemSlug};
      `;
    } else {
      await sql`
        UPDATE player_inventory
        SET quantity = ${newQty}
        WHERE player_id = ${playerId} AND item_slug = ${itemSlug};
      `;
    }

    return { success: true, remainingQuantity: Math.max(0, newQty) };
  }

  // Memory fallback
  const mem = getMemoryStore();
  let userInv = mem.inventory.get(playerId);
  if (!userInv) {
    userInv = new Map();
    mem.inventory.set(playerId, userInv);
  }
  const item = userInv.get(itemSlug);
  if (!item || item.quantity < count) {
    return { success: false, remainingQuantity: 0, error: 'Insufficient quantity in inventory' };
  }

  item.quantity -= count;
  if (item.quantity <= 0) {
    userInv.delete(itemSlug);
  }
  return { success: true, remainingQuantity: Math.max(0, item.quantity) };
}

/**
 * 9. Reward Mars Credits to player wallet on mission completion
 */
export async function rewardPlayerCredits(
  playerId: string,
  credits: number
): Promise<{ success: boolean; newBalance: number }> {
  if (credits <= 0) return { success: true, newBalance: 0 };
  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      INSERT INTO player_wallets (player_id, credits_balance, updated_at)
      VALUES (${playerId}, ${500 + credits}, NOW())
      ON CONFLICT (player_id) DO UPDATE
      SET credits_balance = player_wallets.credits_balance + ${credits},
          updated_at = NOW()
      RETURNING credits_balance;
    `;
    return { success: true, newBalance: rows[0].credits_balance };
  }

  const mem = getMemoryStore();
  let wallet = mem.wallets.get(playerId);
  if (!wallet) {
    wallet = { playerId, creditsBalance: 500 + credits, updatedAt: new Date().toISOString() };
    mem.wallets.set(playerId, wallet);
  } else {
    wallet.creditsBalance += credits;
    wallet.updatedAt = new Date().toISOString();
  }
  return { success: true, newBalance: wallet.creditsBalance };
}

/**
 * 10. Deduct Mars Credits atomically from player wallet
 */
export async function deductPlayerCredits(
  playerId: string,
  amount: number
): Promise<{ success: boolean; remainingCredits: number }> {
  if (amount <= 0) return { success: true, remainingCredits: 0 };
  const sql = await getSqlClient();

  if (sql) {
    // Ensure wallet exists first
    await getPlayerWallet(playerId);

    const rows = await sql`
      UPDATE player_wallets
      SET credits_balance = credits_balance - ${amount},
          updated_at = NOW()
      WHERE player_id = ${playerId} AND credits_balance >= ${amount}
      RETURNING credits_balance;
    `;

    if (!rows || rows.length === 0) {
      throw new Error(`Insufficient Mars Credits: required ${amount} MC`);
    }

    return { success: true, remainingCredits: rows[0].credits_balance };
  }

  const wallet = await getPlayerWallet(playerId);
  if (wallet.creditsBalance < amount) {
    throw new Error(`Insufficient Mars Credits: required ${amount} MC (balance: ${wallet.creditsBalance} MC)`);
  }
  wallet.creditsBalance -= amount;
  wallet.updatedAt = new Date().toISOString();
  return { success: true, remainingCredits: wallet.creditsBalance };
}

/**
 * 11. Execute Direct Supply Store Purchase (Colony Store Direct Stock)
 * Atomically deducts basePrice * quantity from player wallet and upserts into inventory.
 */
export async function executeStorePurchase(options: {
  playerId: string;
  itemSlug: string;
  quantity: number;
  isGrant?: boolean;
}): Promise<{
  success: boolean;
  remainingCredits: number;
  newInventoryQuantity: number;
  totalCost: number;
  itemSlug: string;
}> {
  const { playerId, itemSlug, quantity, isGrant } = options;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Purchase quantity must be a positive integer');
  }

  const itemDef = CATALOG_ITEMS[itemSlug];
  if (!itemDef) {
    throw new Error(`Item ${itemSlug} not found in colony catalog`);
  }

  const totalCost = isGrant ? 0 : itemDef.basePrice * quantity;
  const sql = await getSqlClient();

  if (sql) {
    // 1. Ensure wallet exists and check balance
    let currentWallet = await getPlayerWallet(playerId);

    if (totalCost > 0) {
      const updatedWallets = await sql`
        UPDATE player_wallets
        SET credits_balance = credits_balance - ${totalCost}, updated_at = NOW()
        WHERE player_id = ${playerId} AND credits_balance >= ${totalCost}
        RETURNING credits_balance;
      `;

      if (!updatedWallets || updatedWallets.length === 0) {
        currentWallet = await getPlayerWallet(playerId);
        throw new Error(
          `Insufficient Mars Credits: required ${totalCost} MC, available ${currentWallet.creditsBalance} MC`
        );
      }
      currentWallet = { ...currentWallet, creditsBalance: updatedWallets[0].credits_balance };
    }

    // 2. Upsert bought quantity into inventory
    const invId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const updatedInv = await sql`
      INSERT INTO player_inventory (id, player_id, item_slug, item_name, category, quantity)
      VALUES (${invId}, ${playerId}, ${itemDef.slug}, ${itemDef.name}, ${itemDef.category}, ${quantity})
      ON CONFLICT (player_id, item_slug)
      DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity
      RETURNING quantity;
    `;

    return {
      success: true,
      remainingCredits: currentWallet.creditsBalance,
      newInventoryQuantity: updatedInv[0].quantity,
      totalCost,
      itemSlug,
    };
  }

  // Memory fallback
  const mem = getMemoryStore();
  const wallet = await getPlayerWallet(playerId);

  if (totalCost > 0) {
    if (wallet.creditsBalance < totalCost) {
      throw new Error(
        `Insufficient Mars Credits: required ${totalCost} MC, available ${wallet.creditsBalance} MC`
      );
    }
    wallet.creditsBalance -= totalCost;
    wallet.updatedAt = new Date().toISOString();
  }

  let playerItems = mem.inventory.get(playerId);
  if (!playerItems) {
    playerItems = new Map();
    mem.inventory.set(playerId, playerItems);
  }

  const existing = playerItems.get(itemSlug);
  const newQty = (existing ? existing.quantity : 0) + quantity;

  playerItems.set(itemSlug, {
    id: existing ? existing.id : `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId,
    itemSlug: itemDef.slug,
    itemName: itemDef.name,
    category: itemDef.category,
    quantity: newQty,
    icon: itemDef.icon,
  });

  return {
    success: true,
    remainingCredits: wallet.creditsBalance,
    newInventoryQuantity: newQty,
    totalCost,
    itemSlug,
  };
}

/**
 * 12. Execute Recycle Item for Credits (60% instant refund)
 * Atomically deducts quantity from player inventory and refunds credits.
 */
export async function executeRecycleItem(options: {
  playerId: string;
  itemSlug: string;
  quantity: number;
}): Promise<{
  success: boolean;
  refundCredits: number;
  remainingCredits: number;
  remainingInventoryQuantity: number;
  itemSlug: string;
}> {
  const { playerId, itemSlug, quantity } = options;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Recycle quantity must be a positive integer');
  }

  const itemDef = CATALOG_ITEMS[itemSlug];
  if (!itemDef) {
    throw new Error(`Item ${itemSlug} not found in colony catalog`);
  }

  const refundPerUnit = Math.max(1, Math.floor(itemDef.basePrice * 0.6));
  const totalRefund = refundPerUnit * quantity;
  const sql = await getSqlClient();

  if (sql) {
    // 1. Check & deduct inventory
    const updatedInv = await sql`
      UPDATE player_inventory
      SET quantity = quantity - ${quantity}
      WHERE player_id = ${playerId} AND item_slug = ${itemSlug} AND quantity >= ${quantity}
      RETURNING quantity;
    `;

    if (!updatedInv || updatedInv.length === 0) {
      throw new Error(`Insufficient inventory to recycle (requested ${quantity}x)`);
    }

    // 2. Refund credits to wallet
    const updatedWallets = await sql`
      INSERT INTO player_wallets (player_id, credits_balance, updated_at)
      VALUES (${playerId}, ${totalRefund}, NOW())
      ON CONFLICT (player_id)
      DO UPDATE SET credits_balance = player_wallets.credits_balance + ${totalRefund}, updated_at = NOW()
      RETURNING credits_balance;
    `;

    return {
      success: true,
      refundCredits: totalRefund,
      remainingCredits: updatedWallets[0].credits_balance,
      remainingInventoryQuantity: updatedInv[0].quantity,
      itemSlug,
    };
  }

  // Memory fallback
  const mem = getMemoryStore();
  const playerItems = mem.inventory.get(playerId);
  const existing = playerItems ? playerItems.get(itemSlug) : null;

  if (!existing || existing.quantity < quantity) {
    throw new Error(`Insufficient inventory to recycle (requested ${quantity}x)`);
  }

  existing.quantity -= quantity;
  const wallet = await getPlayerWallet(playerId);
  wallet.creditsBalance += totalRefund;
  wallet.updatedAt = new Date().toISOString();

  return {
    success: true,
    refundCredits: totalRefund,
    remainingCredits: wallet.creditsBalance,
    remainingInventoryQuantity: existing.quantity,
    itemSlug,
  };
}
