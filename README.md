# 🚀 Junior Astronaut Mission Trainer

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Neon Postgres](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![Stripe](https://img.shields.io/badge/Stripe-Hosted_Checkout-635BFF?logo=stripe)](https://stripe.com/)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026-E87040)](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)

A comprehensive, deterministic, multi-world space simulation platform, tactical arcade campaign, live-service economy, and competitive multiplayer trainer built for the **NASA International Space Apps Challenge 2026: Junior Astronaut Mission Trainer** (in collaboration with NASA and the Canadian Space Agency).

Players command deep-space expeditions across the entire **Solar System**—from the classic **30-Sol Martian Outpost Survival** with real NASA ECLSS life-support telemetry (**Power**, **Oxygen**, **Radiation Shielding**, and **Crew Morale**) to **8 bespoke planetary arcade simulations** across Earth, Venus, Mercury, Jupiter, Saturn, Uranus, Neptune, and Planet X.

---

## 📋 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [New Major Features & Engineering Upgrades](#-new-major-features--engineering-upgrades)
- [Solar System Campaign & 9 Planetary Mini-Game Worlds](#-solar-system-campaign--9-planetary-mini-game-worlds)
- [Colony Supply Store & Universal Tactical Supplies](#-colony-supply-store--universal-tactical-supplies)
- [Galactic Battle Pass & VIP System (With "Claim All" Protocol)](#-galactic-battle-pass--vip-system-with-claim-all-protocol)
- [Promo Code Redemption Protocol](#-promo-code-redemption-protocol)
- [Orbital Supply Drops & Anti-Gambling Pity Protocol](#-orbital-supply-drops--anti-gambling-pity-protocol)
- [Orbital Guilds & Outpost Alliances](#-orbital-guilds--outpost-alliances)
- [Real Hosted Stripe Checkout Portal](#-real-hosted-stripe-checkout-portal)
- [Tactical Operations Deck & Command Overrides](#-tactical-operations-deck--command-overrides)
- [Companion Pet Hangar & Tactical Stim Boosts](#-companion-pet-hangar--tactical-stim-boosts)
- [Electronic Warfare & PvP Sabotages](#-electronic-warfare--pvp-sabotages)
- [Endless Survival Tournament & 16-Cadet Bracket](#-endless-survival-tournament--16-cadet-bracket)
- [Single Cadet Dossier & GDPR Deep Account Erasure](#-single-cadet-dossier--gdpr-deep-account-erasure)
- [Core Game Engine & State Machine](#-core-game-engine--state-machine)
- [Dual-Tier Cloud & Local Storage Architecture](#-dual-tier-cloud--local-storage-architecture)
- [Procedural Web Audio Sound Engine](#-procedural-web-audio-sound-engine)
- [NASA & CSA Data Grounding](#-nasa--csa-data-grounding)
- [Directory Structure](#-directory-structure)
- [Getting Started & Environment Configuration](#-getting-started--environment-configuration)
- [Accessibility & UX Engineering](#-accessibility--ux-engineering)
- [License & Attribution](#-license--attribution)

---

## 🏗️ Architectural Overview

The codebase enforces a strict separation between **framework-agnostic domain logic** (`src/lib/`), **strongly typed empirical datasets** (`src/data/`), and the **reactive UI presentation layer** (`src/app/` & `src/components/`).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Presentation Layer (src/components/)                  │
│  MainMenu • HUD • MinigameRouter • OperationsDeck • ColonyStore • EndScreen │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Dispatches GameAction / Reads State
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     React State Bridge (GameProvider.tsx)                   │
│        useReducer(gameReducer) + Telemetry Logger + Cloud Auto-Save         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pure Mathematical State Transitions
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      Pure Domain Engine (src/lib/)                          │
│   gameEngine.ts • planetCartridges.ts • battlePass.ts • operationsDeck.ts   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Typed Synchronous Queries & APIs
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Data & Telemetry Layer (src/data/ & APIs)               │
│  /api/nasa-live • /api/stripe/* • /api/market/* • Neon Serverless Postgres │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 New Major Features & Engineering Upgrades

### 1. 🪐 9-World Solar System Campaign & Dedicated Planetary Mini-Games
* **Solar System Campaign Map (`/planets`):** Linear progression cartridge system where commanders must achieve NASA score clearance thresholds to unlock outer worlds.
* **Bespoke Planetary Gameplay Engines:** Every planetary world features dedicated, self-contained mechanics feeding into the unified `COMPLETE_MINIGAME` engine action, preserving Galaxy Coins, Battle Pass XP, and Campaign progression.
* **Pre-Game Briefing Overlays:** Interactive modal overlays before every mini-game outlining NASA scientific context, objectives, keyboard/touch controls, and loss conditions.

### 2. ⚡ In-Place Mission Reset Lifecycle (No Page Reloads)
* **Instant Lifecycle Reset:** Resolved stale game-over memory loops by keying `<GameProvider>` with `key={`${planetId}-${landingSite}-${runNonce}`}` and mini-game subcomponents with `key={`${planetId}-${sol}-${runId}`}`.
* **One-Click Restart:** Clicking **"🚀 Launch New Game / Play Again"** resets state, clears active saves, and remounts into a fresh mission in-place.

### 3. 🛰️ Hybrid Live NASA Space Weather Telemetry Sync
* **Real-Time DONKI Ingestion (`/api/nasa-live`):** Connects directly to NASA's Space Weather Database Of Notifications, Knowledge, and Information API (`DONKI/FLR` and `DONKI/CME`) with a strict 3.5-second failover timeout.
* **Smart ISR Caching:** Caches solar flares and coronal mass ejections for 15 minutes, preserving API quota while delivering fresh real-time space weather.
* **Zero-Downtime Offline Fallback:** Seamlessly switches to curated historical records (`donki-events.json`) with an amber status indicator (`● OFFLINE TELEMETRY CACHE`).
* **Live Telemetry Ticker (`LiveTelemetryTicker.tsx`):** A marquee status bar mounted across the Command Center and HUD displaying real solar flare classifications (e.g., `M4.2 • Region AR3842`).

### 4. 🪐 Interactive 3D Martian Globe Landing Zone Selector
* **Procedural 3D Canvas (`MarsGlobeSelector.tsx`):** A lightweight HTML5 3D sphere rendered with mathematical coordinate projections, rotational friction, lat/lon graticules, procedural surface shading, and polar ice caps.
* **Authentic Martian Geography:** Select between three landing sites that dynamically alter survival physics:
  * **Jezero Crater** (`18.38°N, 77.58°E`): Ancient river delta, balanced conditions, +10% scientific research score bonus.
  * **Gale Crater** (`5.4°S, 137.8°E`): Low elevation with denser atmospheric shielding: -15% O₂ drain, -10% shield drain, but -10% solar power due to atmospheric dust.
  * **Olympus Mons** (`18.65°N, 226.2°E`): Highest peak in the solar system: +25% solar energy gain from direct sunlight, but +20% O₂ drain and +15% radiation shield drain due to ultra-thin atmosphere.

### 5. 📊 Real-Time Multi-Series Telemetry Sparklines & Analytics
* **Sol-by-Sol Telemetry Recorder:** Tracks an immutable `telemetryHistory` capturing Power, Oxygen, Shielding, Morale, and hazard events on every sol.
* **Pure SVG Chart Engine (`TelemetryChart.tsx`):** Multi-series vector curves plotting all four vital streams without external charting dependencies. Includes a red dashed 20% critical survival threshold, crisis flags with hover readouts, and series toggles (`ALL`, `POWER`, `O2`, `SHIELDS`, `MORALE`).

### 6. 🏁 Competitive Squad Mode (4-Cadet Synchronized Mars Race)
* **Deterministic Synchronized Simulation:** Up to 4 cadets compete simultaneously on the same Mars landing zone and identical NASA DONKI solar weather seed.
* **Mulberry32 Seeded PRNG:** Events, dust storms, and solar particle strikes are deterministically generated via `Mulberry32(seed + sol * 1337 + usedEvents * 31)`.
* **Resilient Offline/Flaky Wi-Fi Mesh:** Game simulation runs purely in local client memory. Telemetry syncs (`POST /api/squad` action `SYNC`) fire non-blockingly in the background with a 3.5-second timeout and silent catch.

### 7. ⏱️ Timed Crisis Mode (15s Decision Window & Rapid Response Bonuses)
* **High-Stakes Decision Clock:** Strict 15.0-second countdown on every Sol (and blitz clock in arcade mini-games) to evaluate telemetry and commit countermeasures.
* **Dynamic Audio & Visual Warnings:** Warning amber below `6s`, pulsing emergency red below `3s`, and audible synthesized blips on critical seconds.

---

## 🪐 Solar System Campaign & 9 Planetary Mini-Game Worlds

The campaign map at `/planets` and mission briefing portal `/planets/[planetId]` route players through the solar system with linear unlock thresholds (`requiredPrevScore`):

| # | World | Destination Sector | Gameplay Mechanic | Objectives & Challenges |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Earth** 🌍 | `iss_zenith` | **Asteroid Impact Triangulation** | 8×8 tactical radar coordinate pinging (`aspect-square` tiles) to locate 3 kinetic bolide impact fragments using HOT/WARM/COLD thermal distance indicators and evacuation beacons. |
| **2** | **Mars** 🔴 | `jezero`, `gale`, `olympus_mons` | **Classic 30-Sol Outpost Survival** | 30-sol survival card engine balancing Power, Oxygen, Shielding, and Morale against NASA space weather and space biology crises. |
| **3** | **Venus** ☁️ | `cloud_city_alpha` | **Aerostat Cloud-City Wave-Rider** | Thermodynamic altitude survival piloting a NASA HAVOC airship in the 50–60 km temperate zone; vent ballast, fire heaters, dodge sulfuric acid cells (`H₂SO₄`) and wind shears. |
| **4** | **Mercury** 🌑 | `caloris_basin` | **Orbital Kinetic Railgun Defense** | Vector railgun defense intercepting falling iron-core meteorites and coronal solar thermal gusts before base shields collapse. |
| **5** | **Jupiter** 🌪️ | `radiation_belt_halo` | **Gravity Slingshot Navigation** | 2D orbital gravity-assist slingshot timing around Jupiter's gravity well, dodging high-radiation belts, and timing burns past Io and Europa. |
| **6** | **Saturn** 🪐 | `cassini_division` | **Cassini Division Ring Threader** | Threading dense planetary ring bands; steering through high-velocity ice chunks, micro-meteorite swarms, and gaps with magnetic harpoons. |
| **7** | **Uranus** 💎 | `diamond_rain_depths` | **Diamond Rain Bathysphere Harvester** | High-pressure bathysphere diving into Uranus's mantle to harvest solid diamond hail while avoiding methane storm whirlpools. |
| **8** | **Neptune** 💨 | `great_dark_spot` | **Jetstream Runner** | Navigating 2,100 km/h supersonic jetstreams, riding high-speed thermal velocity corridors, and dodging dark vortex shears. |
| **9** | **Planet X** 🌌 | `kuiper_edge` | **Kuiper Gravitational Anomaly Boss** | Multi-phase deep-space boss encounter deploying frequency shield harmonics, antimatter probes, and micro-black-hole countermeasures. |

---

## 🛒 Colony Supply Store & Universal Tactical Supplies

Accessible from `/store` or in-game pause decks (`src/components/game/ColonyStoreContent.tsx`):

* **Universal Cross-Game Power-Ups (`[ALL WORLDS]`):**
  * ⚡ **Kinetic Railgun Overcharger (`kinetic-overcharger`):** +25% score multiplier in arcade mini-games and +15 Power on Mars.
  * 📡 **Quantum Deep-Scan Pulse (`quantum-scanner`):** +3 extra radar scans on Earth, reveals hidden hazards on Saturn/Neptune, and +15% research score on Mars.
  * 🛡️ **Aegis Hull Reinforcement (`aegis-hull-matrix`):** +35% starting hull integrity in mini-games and +20 Shielding on Mars.
  * ⏳ **Chrono-Stasis Capacitor (`chrono-stabilizer`):** +10 extra seconds in Timed Blitz modes and +10 Morale on Mars.
* **Mars Survival Consumables (`[MARS SURVIVAL]`):**
  * Oxygen Canisters, Fuel Cells, Radiation Shield Packs, Hydroponic Rations, and Emergency Scrubbers.
* **Inventory Viewer & 60% Recycling Protocol (`/api/market/recycle`):** Inspect active items in your cargo bay, consume items directly for tactical preparation, or recycle surplus inventory to reclaim 60% of baseline credit value.

---

## 🎖️ Galactic Battle Pass & VIP System (With "Claim All" Protocol)

Persistent seasonal progression system managed by `src/lib/battlePass.ts` with local storage (`jat_battlepass_v1`) and cloud synchronization:

* **Dual-Track 10-Tier Seasonal Progression:**
  * **Free Cadet Track:** Mars Credit payouts (100–300 MC), basic emergency consumables, and tech modules.
  * **Five-Star General VIP Track:** Premium credit payouts (500–2,000 MC), rare technology modules, and exclusive military cosmetics.
* **Batch "Claim All" Protocol (`claimAllBattlePassRewards`):**
  * **Dynamic Calculation:** Automatically computes `claimableCount` from current XP and claimed tier arrays.
  * **Glowing Header CTA:** Renders a glowing `✨ Claim All Rewards ({claimableCount})` button in `BattlePassModal.tsx` and the Store Battle Pass tab.
  * **Single-Write Atomic Persistence:** Writes all newly claimed Free and VIP tiers to `localStorage` in one write.
  * **Single Batched Database Transaction:** Sums all Galaxy Coin rewards across claimed tiers into a **single `/api/market/reward` call**, preventing concurrent database statement deadlocks.
  * **Real-Time Wallet Sync:** Calls `writeSynchronousWallet` and dispatches `jat-wallet-updated` to synchronize balances across all open views immediately.
  * **Confirmation Feedback:** Displays a green/gold confirmation banner detailing total credits and items claimed.
* **Five-Star General VIP Entitlements:**
  * ⭐ Golden VIP badge mounted on Main Menu, HUD, and Leaderboards.
  * 💰 **+25% Permanent Credit Boost** on all mission debrief payouts.
  * 🛸 **Daily Free Sovereign Vault** drop every 24 hours.
  * 🔄 **3 Emergency Life-Support Retries** per mission when vitals collapse.

---

## 🎁 Promo Code Redemption Protocol

A secure, one-time-per-player promo code system (`/api/market/promo/route.ts` & `src/lib/marketplace.ts`):

* **Anti-Duplicate Security:** Enforces one-time redemption per cadet callsign/player ID via the Neon Postgres `redeemed_promo_codes` table with an in-memory `Set<string>` fallback (`${playerId}:${normalizedCode}`).
* **Statement Split Optimization:** All database migrations and promo verifications use separate `await sql` queries, ensuring zero `cannot insert multiple commands into a prepared statement` errors.
* **Valid Operational Codes:**
  * `SPACEAPPS2026`: 1,000 Galaxy Coins + Free Starter Pack.
  * `DONKI2026`: 500 Galaxy Coins + 2x Shield Packs.
  * `MARSBASE`: 250 Galaxy Coins + 2x Liquid Oxygen Canisters.
  * `VIPPASS`: Unlocks Five-Star General VIP entitlement + 3 Emergency Retries.
  * `COSMIC500`: 500 Galaxy Coins.

---

## 🎰 Orbital Supply Drops & Anti-Gambling Pity Protocol

An ethical, transparent orbital supply drop system (`/api/market/open-crate/route.ts`):

* **3 Crate Tiers:**
  * 📦 **Standard Drop (150 MC):** Balanced drop yielding common-to-rare supplies and credits.
  * 🔷 **Elite Pod (350 MC):** High-tier drop with enhanced rare/epic probabilities and an automatic **100 MC rebate** deposited directly to player wallet.
  * 👑 **Sovereign Vault (750 MC):** Maximum drop tier with **2x loot yields**, highest Legendary probabilities, and 1 daily free drop for Five-Star General VIPs.
* **Anti-Gambling Guaranteed Pity Counter (`jat_crate_pity_v1`):**
  * Tracks opens since last Legendary item.
  * **Hard Pity Guarantee:** Guarantees a top-tier **Legendary** item on every 5th open, completely preventing unfair streak losses.
  * Clear visual progress meter in the UI showing `X/5 opens until guaranteed Legendary`.

---

## 🛡️ Orbital Guilds & Outpost Alliances

Collaborative player coalitions (`/api/guilds` & `src/components/game/GuildModal.tsx`):

* **Guild Roster & Creation:** Form or enlist in planetary orbital guilds with custom callsign tags, emblems, and mission mottos.
* **Shared Guild Contributions:** All mission scores earned in campaign worlds contribute directly to guild seasonal experience.
* **Active Guild Buffs:** Unlocks passive perks across all guild members:
  * 💰 **Guild Commercial Dividend:** +10% bonus Galaxy Coins on all mission debriefs.
  * 🛡️ **Radiation Deflector Array:** +5 baseline shielding on Mars and +10% mini-game hull integrity.

---

## 💳 Real Hosted Stripe Checkout Portal

Direct integration with Stripe Checkout (`src/app/api/stripe/checkout/route.ts`):

* **Real Hosted Checkout (`checkout.stripe.com`):** Direct server-side redirect to Stripe's hosted payment portal.
* **Curated Supply Packages:**
  * **Cadet Rations:** 500 MC ($0.99)
  * **Commander Supply Drop:** 1,200 MC ($1.99)
  * **Outpost Mega Bundle:** 3,500 MC ($4.99)
  * **Five-Star General Pass:** Lifetime VIP status + 1,000 MC ($4.99)
* **Secure Fulfillments & Verification:** Returns customers back to `/store?payment=success&session_id={CHECKOUT_SESSION_ID}` with automatic credit crediting and toast notifications.

---

## 🃏 Tactical Operations Deck & Command Overrides

Replaces static button actions with a dynamic 5-card operations deck on Mars (`src/components/game/OperationsDeck.tsx` & `src/lib/operationsDeck.ts`):

* **Dynamic 5-Card Draw:** Hand draws 5 tactical operations from a 12-card balanced outpost operations deck each Sol.
* **Emergency Tactical Re-Roll:** Once per sol, commanders can re-shuffle their hand to fish for critical life-support actions.
* **Action Cooldowns:** High-impact operations enforce cooldown turns to encourage strategic resource rotation.
* **Command Overrides & Crisis Cards:** Automatically draws specialized countermeasure cards into the hand during high-priority space weather hazards.

---

## 🐾 Companion Pet Hangar & Tactical Stim Boosts

Autonomous companions and synthetic stim boosters that enhance survival parameters (`src/components/game/PetHangarModal.tsx`):

* **4 Companion Pet Archetypes:**
  * 🤖 **Rover-Bot Alpha:** Autonomous scout providing passive daily energy recovery and dust clearing.
  * 🦎 **Martian Tardigrade:** Bio-engineered organism offering passive radiation resistance and bio-dome boosts.
  * 🛰️ **Aero-Drone Echo:** Aerial scout providing early atmospheric hazard warnings and scouting bonuses.
  * 🐕 **Robo-Canine Buster:** Morale-stabilizing robotic companion that mitigates isolation stress.
* **Tactical Stim Loadouts:** Slot up to 2 active stims into your flight suit before launch (`Nanogel Infusion`, `Adrenaline Shot`, `Shield Booster`, `Oxygen Hyper-Filter`).

---

## 📡 Electronic Warfare & PvP Sabotages

Competitive disruption mechanics for multiplayer and squad race engagements (`src/lib/sabotageEngine.ts` & `/api/sabotage/*`):

* **Tactical Electronic Countermeasures:**
  * ⚡ **EMP Jam:** Temporarily scrambles a rival cadet's solar relays, reducing power generation for 2 sols.
  * 📦 **Supply Intercept:** Redirects orbital supply drop telemetry to harvest bonus credits from rival sectors.
  * 📡 **Comms Spoof:** Generates phantom hazard alarms on the target's radar, taxing their crew morale.
  * ☀️ **Solar Blind:** Overloads external camera sensors during solar maximums.

---

## 🏆 Endless Survival Tournament & 16-Cadet Bracket

An automated 16-cadet single-elimination tournament engine (`src/lib/tournamentEngine.ts` & `src/components/game/TournamentModal.tsx`):

* **16-Cadet Seeded Bracket:** Simulates a full competitive bracket with automated round progression across Round of 16, Quarterfinals, Semifinals, and Grand Championship.
* **Dynamic AI Rival Simulation:** Simulates rival commanders based on their tactical specialty, survival stats, and risk-taking profiles.
* **Endless Survival Scaling:** Sols scale past Sol 30 with exponentially escalating environmental decay for hardcore survivalists.

---

## 👨‍🚀 Single Cadet Dossier & GDPR Deep Account Erasure

Streamlined, privacy-first astronaut identity management (`src/lib/profile.ts`, `src/lib/storageAdapter.ts`, `src/components/game/ProfileModal.tsx`):

* **Zero-Friction Single Dossier:** No passwords, accounts, or emails required. Every player operates an active local cadet dossier with editable callsign (`e.g., CDR-NOVA-01`), avatar patch, and chosen astronaut specialty:
  * 🔧 **Systems Engineer:** +20% power gained from solar panel operations.
  * 🌱 **Astrobiologist:** +20% oxygen gained from greenhouse farming.
  * 🛡️ **Shielding Physicist:** +25% shielding restored during shield boost protocols.
  * 🎖️ **Mission Commander:** +5 crew morale preserved every sol.
* **Complete GDPR & Classroom Privacy Deep Purge:**
  * One-click **Delete Cadet Profile** button inside `ProfileModal.tsx`.
  * **Full-Stack Deep Purge:** Calls `DELETE /api/profile?cadetId=...` which purges all server-side tables in Neon Postgres (`cadet_profiles`, `active_saves`, `leaderboard_entries`, `squad_rooms`, `player_wallets`, `player_inventory`, `redeemed_promo_codes`).
  * **Client Local Reset:** Calls `resetBattlePassState()` and `resetPlanetProgress()`, purging all localStorage keys and cached credentials, instantly refreshing the game into a pristine state.

---

## ⚙️ Core Game Engine & State Machine

Each Martian day (**Sol**) executes a deterministic finite state machine managed by `gameReducer` in `src/lib/gameEngine.ts`:

```text
  [briefing] ──(START_MISSION)──▶ [action] ◀───────────────────────────┐
                                     │                                 │
                             (PERFORM_ACTION)                          │
                                     ▼                                 │
                              [checkGameOver] ──(vital <= 0)──▶ [gameover]
                                     │                                 │
                                  (alive)                              │
                                     ▼                                 │
                                  [result]                             │
                                     │                                 │
                            (NEXT_SOL / 1.5s)                          │
                                     ▼                                 │
                          [applySolDepletion]                          │
                                     │                                 │
                            [generateEvent roll]                        │
                             ├──(hit)───▶ [event] ──(RESOLVE_EVENT)─────┤
                             └──(miss)──▶ [ADVANCE_SOL] ────────────────┤
                                               │                        │
                                        (sol > 30) ──▶ [victory]        │
                                               └────────────────────────┘
```

For non-Mars worlds, the state machine routes directly to `<MinigameRouter>` where interactive arcade actions trigger `COMPLETE_MINIGAME` upon sector clearance or hull collapse, immediately transitioning to `victory` or `gameover` with accurate composite score attribution.

---

## 🗄️ Dual-Tier Cloud & Local Storage Architecture

The storage adapter (`src/lib/storageAdapter.ts`) automatically detects its runtime environment:

1. **Cloud Tier (Neon Serverless Postgres):**
   * Connects via `@neondatabase/serverless` using `DATABASE_URL` or `POSTGRES_URL`.
   * Provisions tables automatically using split queries: `cadet_profiles`, `active_saves`, `leaderboard_entries`, `player_wallets`, `player_inventory`, `squad_rooms`, and `redeemed_promo_codes`.
   * **Anti-Cheat Validation:** High scores submitted to the leaderboard are independently recalculated server-side from raw game vitals.
2. **Local Fallback Tier (`localStorage`):**
   * If database environment variables are not configured or network drops, the application falls back seamlessly to browser storage (`jat_profile_v1`, `jat_active_save_v1`, `jat_battlepass_v1`, `jat_crate_pity_v1`, `jat_planet_best_scores_v1`).
   * Guarantees 100% offline functionality with zero UI errors or setup friction.

---

## 🔊 Procedural Web Audio Sound Engine

* **Zero Copyright / Zero Downloads (`src/lib/sound.ts`):** Synthesizes retro-futuristic sound effects on the fly using the browser's native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`).
* **Browser Autoplay Compliant:** Unlocks audio lazily on the first user click to respect modern browser policies.
* **Sound Palette:** Crisp UI blips (`playClick`), power-up chimes (`playAction`), two-tone space klaxons (`playAlert`), victory fanfares (`playVictory`), radar pings, and an optional filtered cosmic ambient hum.

---

## 🛰️ NASA & CSA Data Grounding

Every crisis event, radiation penalty, and educational fact in the simulation maps directly to official challenge resources:

| Dataset / API | Source | Records | In-Game Integration |
| :--- | :--- | :---: | :--- |
| **NASA DONKI Live** | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Live + 18 cached | Real-time solar flares (M/X Class) and CMEs streaming into the ticker and crisis generator. |
| **ISS RadLab** | [NASA ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | **12** | Absorbed radiation dose rates (`147.9–312.4 μGy/day`) from `DOSTEL` and `TEPC` calibrating radiation events. |
| **NASA OSDR** | [NASA OSDR](https://osdr.nasa.gov/bio/) | **16** | Peer-reviewed studies on bone density, DNA repair, and SANS vision powering research discoveries. |
| **NASA Image Library** | [NASA Images API](https://images-api.nasa.gov/) | **17+** | High-resolution Mars surface imagery from *Curiosity*, *Perseverance*, *Opportunity*, and *Spirit*. |
| **NASA Micro-Facts** | NASA JPL / ECLSS / HRP | **30** | Categorized STEM facts displayed in `NASAFactPopup` and campaign briefing dossiers. |

---

## 📂 Directory Structure

```text
junior-astronaut-trainer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── guilds/route.ts            # Orbital Guilds creation, scores & alliances
│   │   │   ├── image-proxy/route.ts       # Secure IPv4 image streaming proxy
│   │   │   ├── leaderboard/route.ts       # Anti-cheat score verification & Neon ranking
│   │   │   ├── market/                    # Store purchases, crates, wallet, promo, recycling
│   │   │   │   ├── open-crate/route.ts    # Orbital drop opening with pity counter
│   │   │   │   ├── promo/route.ts         # One-time promo code redemption engine
│   │   │   │   ├── recycle/route.ts       # 60% credit recycling protocol
│   │   │   │   ├── reward/route.ts        # Batched Galaxy Coin & Pet XP rewards
│   │   │   │   ├── store-buy/route.ts     # Store purchase and item grant handler
│   │   │   │   └── wallet/route.ts        # Player Mars Credit balance sync
│   │   │   ├── nasa-live/route.ts         # 15-min ISR live DONKI solar flare ingestion
│   │   │   ├── pets/route.ts              # Companion drone & pet equipment sync
│   │   │   ├── profile/route.ts           # Cloud cadet dossier sync & deep purge
│   │   │   ├── rover-photos/route.ts      # Mars Rover photography API
│   │   │   ├── sabotage/route.ts          # PvP electronic warfare triggers
│   │   │   ├── save/route.ts              # Cloud mission auto-save & purge
│   │   │   ├── squad/route.ts             # 4-cadet race lobby & telemetry sync
│   │   │   ├── stripe/                    # Hosted Stripe checkout & webhooks
│   │   │   │   ├── checkout/route.ts      # Real hosted checkout portal redirect
│   │   │   │   └── webhook/route.ts       # Stripe webhook payment fulfillment
│   │   │   └── tournaments/route.ts       # 16-cadet bracket match coordinator
│   │   ├── game/page.tsx                  # Mission runner with instant key-based remounting
│   │   ├── planets/                       # Solar System Campaign Map
│   │   │   ├── page.tsx                   # Interactive planetary sector cartridge map
│   │   │   └── [planetId]/page.tsx        # Planetary tactical briefing & launch portal
│   │   ├── store/page.tsx                 # Full-screen Colony Supply Store & Outpost Logistics
│   │   ├── globals.css                    # Tailwind v4 theme tokens & animations
│   │   ├── layout.tsx                     # Root layout with typography & metadata
│   │   └── page.tsx                       # Command Center Main Menu & status ticker
│   ├── components/
│   │   ├── game/
│   │   │   ├── minigames/                 # 8 Dedicated Planetary Arcade Engines
│   │   │   │   ├── EarthImpactTriangulation.tsx
│   │   │   │   ├── VenusAerostatSurf.tsx
│   │   │   │   ├── MercuryMeteorDefense.tsx
│   │   │   │   ├── JupiterGravitySlingshot.tsx
│   │   │   │   ├── SaturnRingThreader.tsx
│   │   │   │   ├── UranusDiamondHarvester.tsx
│   │   │   │   ├── NeptuneJetstreamRunner.tsx
│   │   │   │   └── PlanetXAnomalyBoss.tsx
│   │   │   ├── ActionPanel.tsx            # Outpost life-support operation controls
│   │   │   ├── BattlePassModal.tsx        # Dedicated Battle Pass & Batch Claim All Dialog
│   │   │   ├── ColonyStoreContent.tsx     # 4-tab Colony Store, VIP, Crates & Claim All UI
│   │   │   ├── EndScreen.tsx              # Mission debrief, telemetry curve & certificate
│   │   │   ├── EventCard.tsx              # Space weather alert dialog & countermeasures
│   │   │   ├── GameBoard.tsx              # MinigameRouter & Mars 30-sol deck coordinator
│   │   │   ├── GameProvider.tsx           # React Context + state machine bridge
│   │   │   ├── GuildModal.tsx             # Orbital Guilds coalition hub & buff manager
│   │   │   ├── HUD.tsx                    # Vital gauges, Sol clock, VIP badge & Retries
│   │   │   ├── LeaderboardModal.tsx       # Top 25 verified global cadet rankings
│   │   │   ├── LiveTelemetryTicker.tsx    # Marquee NASA solar weather bar & dossier modal
│   │   │   ├── MainMenu.tsx               # Command Center portal & station navigation
│   │   │   ├── MarsGlobeSelector.tsx      # Interactive HTML5 3D Martian landing globe
│   │   │   ├── MarsView.tsx               # Atmospheric & planetary environmental backdrops
│   │   │   ├── OperationsDeck.tsx         # 5-card dynamic operations deck & re-rolls
│   │   │   ├── PauseMenu.tsx              # Clean mission exit & pause dialog
│   │   │   ├── PetHangarModal.tsx         # Companion pets & perk equipment
│   │   │   ├── ProfileModal.tsx           # Single-cadet dossier & deep purge button
│   │   │   ├── RoverGalleryModal.tsx      # NASA Mars rover photo gallery
│   │   │   ├── SquadRaceModal.tsx         # Competitive 4-cadet lobby & race codes
│   │   │   ├── TelemetryChart.tsx         # Pure SVG multi-series vital analytics curves
│   │   │   └── TournamentModal.tsx        # 16-cadet bracket visualization
│   │   └── ui/
│   │       ├── Button.tsx                 # Accessible multi-variant button primitive
│   │       ├── Modal.tsx                  # Focus-safe dialog with Escape key trap
│   │       └── ProgressBar.tsx            # ARIA meter with low-resource warning pulses
│   ├── context/
│   │   └── WalletContext.tsx              # Synchronous wallet provider & balance listener
│   ├── data/                              # Verified empirical NASA JSON datasets
│   └── lib/                               # Domain engine, planetCartridges, battlePass, sound & storage
├── PROJECT_GUIDE.md                       # In-depth non-technical educator & student guide
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started & Environment Configuration

### Prerequisites
* **Node.js** `>= 20.9.0`
* **npm**, **yarn**, **pnpm**, or **bun**

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/omarahmedthe25th/junior-astronaut-trainer.git
   cd junior-astronaut-trainer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables in `.env.local`:**
   ```env
   # Neon Serverless Postgres (optional: falls back to localStorage automatically)
   DATABASE_URL=postgresql://user:password@ep-sample.neon.tech/neondb?sslmode=require

   # NASA API Key (optional: defaults to NASA DEMO_KEY)
   NASA_API_KEY=DEMO_KEY

   # Stripe Secret Key (enables hosted checkout portal for credit packs & VIP)
   STRIPE_SECRET_KEY=sk_test_...
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
# Type-check and build optimized production bundle
npm run build

# Start production server
npm run start -- -p 3000
```

---

## ♿ Accessibility & UX Engineering

Designed for young learners (`ages 8–14`) across classroom Chromebooks, tablets, and desktop browsers:
* **Semantic ARIA Telemetry:** Resource bars implement `role="meter"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`; crisis prompts use `role="alertdialog"`.
* **Touch-First Ergonomics:** All interactive buttons, action cards, and modal dismissals enforce a minimum `44×44px` touch target.
* **Scaffolded STEM Vocabulary:** Technical terms are defined in-game, and every crisis cites its authentic NASA discovery source.

---

## 📄 License & Attribution

Built by **Omar Ahmed Abdel Hameed (Team ATT&CK)** for the **NASA International Space Apps Challenge 2026**.

All scientific datasets and imagery metadata are sourced from publicly available NASA Open Data portals ([DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/), [OSDR](https://osdr.nasa.gov/bio/), [Mars Image Library](https://images.nasa.gov/)). This project is an educational hackathon submission and is not officially affiliated with or endorsed by NASA or the Canadian Space Agency.
