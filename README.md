# 🚀 Junior Astronaut Mission Trainer

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Neon Postgres](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![Stripe](https://img.shields.io/badge/Stripe-Hosted_Checkout-635BFF?logo=stripe)](https://stripe.com/)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026-E87040)](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)

A deterministic, turn-based Mars outpost survival simulator, live-service economy, and competitive tactical platform built for the **NASA International Space Apps Challenge 2026: Junior Astronaut Mission Trainer** (in collaboration with NASA and the Canadian Space Agency).

Players command a four-person Martian habitat across **30 sols**, balancing critical life-support telemetry (**Power**, **Oxygen**, **Radiation Shielding**, and **Crew Morale**) against real historical space weather events, radiation dose profiles, and space biology hazards derived from official NASA Open Data repositories.

---

## 📋 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [New Major Features & Engineering Upgrades](#-new-major-features--engineering-upgrades)
- [Colony Supply Store & Outpost Logistics](#-colony-supply-store--outpost-logistics)
- [Galactic Battle Pass & Five-Star General VIP System](#-galactic-battle-pass--five-star-general-vip-system)
- [Orbital Supply Drops & Anti-Gambling Pity Protocol](#-orbital-supply-drops--anti-gambling-pity-protocol)
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
│  MainMenu • HUD • ActionPanel • OperationsDeck • ColonyStore • EndScreen   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Dispatches GameAction / Reads State
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     React State Bridge (GameProvider.tsx)                   │
│        useReducer(gameReducer) + Telemetry Logger + Cloud Auto-Save         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pure Mathematical State Transitions
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      Pure Domain Engine (src/lib/)                          │
│   gameEngine.ts • battlePass.ts • operationsDeck.ts • tournamentEngine.ts   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Typed Synchronous Queries & APIs
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Data & Telemetry Layer (src/data/ & APIs)               │
│  /api/nasa-live • /api/stripe/* • /api/market/* • Neon Serverless Postgres │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 New Major Features & Engineering Upgrades

### 1. 🛰️ Hybrid Live NASA Space Weather Telemetry Sync
* **Real-Time DONKI Ingestion (`/api/nasa-live`):** Connects directly to NASA's Space Weather Database Of Notifications, Knowledge, and Information API (`DONKI/FLR` and `DONKI/CME`) with a strict 3.5-second failover timeout.
* **Smart ISR Caching:** Caches solar flares and coronal mass ejections for 15 minutes, preserving API quota while delivering fresh real-time space weather.
* **Zero-Downtime Offline Fallback:** If NASA rate limits or the client goes offline, the endpoint seamlessly switches to curated historical records (`donki-events.json`) with an amber status indicator (`● OFFLINE TELEMETRY CACHE`).
* **Live Telemetry Ticker (`LiveTelemetryTicker.tsx`):** A marquee status bar mounted across the Command Center and HUD, displaying real solar flare classifications (e.g., `M4.2 • Region AR3842`). Clicking an event opens a technical dossier modal with radiation impact readouts.

### 2. 🪐 Interactive 3D Martian Globe Landing Zone Selector
* **Procedural 3D Canvas (`MarsGlobeSelector.tsx`):** A lightweight HTML5 3D sphere rendered with mathematical coordinate projections, rotational friction, lat/lon graticules, procedural surface shading, and polar ice caps.
* **Authentic Martian Geography:** Players can select between three real landing sites that dynamically alter game physics:
  * **Jezero Crater** (`18.38°N, 77.58°E`): Ancient river delta, balanced conditions, +10% scientific research score bonus.
  * **Gale Crater** (`5.4°S, 137.8°E`): Low elevation with denser atmospheric shielding: -15% O₂ drain, -10% shield drain, but -10% solar power due to atmospheric dust.
  * **Olympus Mons** (`18.65°N, 226.2°E`): Highest peak in the solar system: +25% solar energy gain from direct sunlight, but +20% O₂ drain and +15% radiation shield drain due to ultra-thin atmosphere.

### 3. 📊 Real-Time Multi-Series Telemetry Sparkline & Analytics
* **Sol-by-Sol Telemetry Recorder:** Tracks an immutable `telemetryHistory` array capturing Power, Oxygen, Shielding, Morale, and hazard event tags on every sol.
* **Pure SVG Chart Engine (`TelemetryChart.tsx`):** Multi-series vector curves plotting all four vital streams without external charting dependencies. Includes a red dashed 20% critical survival threshold, crisis flags with hover readouts, and series toggles (`ALL`, `POWER`, `O2`, `SHIELDS`, `MORALE`).
* **Mid-Mission & Debrief Access:** Accessible mid-mission via the **📊 Telemetry** button in the HUD and embedded on the Mission Debrief screen to analyze life-support trends.

### 4. 📷 NASA Image & Video Library Rover Archive & IPv4 Image Proxy
* **Official NASA Mars Photography:** Displays genuine surface photographs from *Curiosity*, *Perseverance*, *Opportunity*, and *Spirit* rovers in Gale, Jezero, and Gusev craters.
* **Dedicated IPv4 Image Proxy (`/api/image-proxy`):** Bypasses Windows IPv6 government CDN routing drops and CORS restrictions by streaming authentic NASA imagery through a secure, high-speed local proxy with HTTP caching headers.

### 5. 📜 Official Printable Mars Outpost Completion Certificate
* **Post-Mission Certification (`EndScreen.tsx`):** Victorious commanders receive an official Mars Outpost Expedition Certificate displaying their callsign, avatar, specialty title, Sol 30 verification, career score, and the official Seal of Mars Base Alpha.
* **Print & PDF Ready:** Features a print-optimized stylesheet for classroom diplomas and science fair presentations.

### 6. 🏁 Competitive Squad Mode (4-Cadet Synchronized Mars Race)
* **Deterministic Synchronized Simulation:** Up to 4 cadets compete simultaneously on the same Mars landing zone and identical NASA DONKI solar weather seed.
* **Mulberry32 Seeded PRNG:** Events, dust storms, and solar particle strikes are deterministically generated via `Mulberry32(seed + sol * 1337 + usedEvents * 31)`, ensuring all players encounter the exact same operational challenges without requiring heavy peer-to-peer state streaming.
* **Resilient Offline/Flaky Wi-Fi Mesh:** Game simulation runs purely in local client memory. Telemetry syncs (`POST /api/squad` action `SYNC`) fire non-blockingly in the background with a 3.5-second timeout and silent catch, guaranteeing network lags never freeze the turn-based loop.
* **Lobby & Room System (`SquadRaceModal.tsx`):** Create or join 6-character room codes with landing site selection, host controls, and automatic 1.5s lobby polling.
* **Live In-Flight Standings Ribbon (`HUD.tsx`):** Live telemetry ribbon displays real-time ranking (`#1` to `#4`), cadet callsign, Sol progression, vital averages, and active survival badges.

### 7. ⏱️ Timed Crisis Mode (15s Decision Window & Rapid Response Bonuses)
* **High-Stakes Decision Clock:** Optional mode available across both Solo Mission and Squad Race. Gives cadets a strict 15.0-second countdown on every Sol to evaluate telemetry and commit countermeasures.
* **Dynamic Visual & Audio Warnings:** The HUD countdown clock transitions to warning amber below `6s`, pulsing emergency red below `3s`, with an audible countdown blip on critical seconds.
* **Instant Loss on Timeout:** If the clock strikes `0.0s` before committing an action, life-support protocols suffer catastrophic failure, immediately ending the mission.
* **Rapid Response Speed Bonuses:** Fast decision-makers receive composite score bonuses (`Math.round(timeRemaining * 10)` pts) per Sol, logged into career credentials and synced to the Squad Leaderboard.

---

## 🛒 Colony Supply Store & Outpost Logistics

A dedicated full-screen tactical exchange accessible from the Command Center at `/store` (`src/components/game/ColonyStoreContent.tsx`):

* **4 Unified Department Tabs:**
  1. 📦 **Outpost Supply Store:** Tactical consumables, survival tech modules, radiation medicines, and companion drones with fixed Mars Credit (`MC`) pricing.
  2. 🎖️ **Battle Pass & VIP:** Dual-track season progression, Tier level-up claims, and Five-Star General VIP upgrade portal.
  3. 🎰 **Supply Drop Crates:** Standard, Elite, and Sovereign Vault orbital drops with real-time pity counter visualization.
  4. 💳 **Economy & Recharges:** Real hosted Stripe checkout packs ($0.99–$4.99) for instant Mars Credit top-ups.
* **Stat Boost Telemetry Previews:** Displays immediate life-support deltas (`+25 ⚡ Power`, `+30 🫁 Oxygen`, `+35 🛡️ Shielding`, `+20 💪 Morale`) for every consumable before purchase.
* **Inventory Viewer & 60% Recycling Protocol (`/api/market/recycle`):** Inspect active items in your cargo bay, consume items directly for tactical preparation, or recycle surplus inventory to reclaim 60% of the item's baseline credit value.

---

## 🎖️ Galactic Battle Pass & Five-Star General VIP System

Persistent seasonal progression system managed by `src/lib/battlePass.ts` with local storage (`jat_battlepass_v1`) and cloud synchronization:

* **Dual-Track 10-Tier Seasonal Progression:**
  * **Free Cadet Track:** Mars Credit payouts (100–300 MC), basic emergency consumables (`oxygen-canister`, `fuel-cell`, `hydroponic-rations`), and standard tech modules.
  * **Five-Star General VIP Track:** Premium credit payouts (500–2,000 MC), rare technology modules (`rad-shielding`, `hull-plating`, `nanogel-infuser`), and exclusive military cosmetics.
* **Automatic Mission XP Conversion:** Automatically awards Battle Pass XP on mission completion (`Math.max(100, Math.round(score * 0.25))` XP) with a guaranteed `+500 XP` Sol-30 survival completion bonus.
* **Five-Star General VIP Entitlements:**
  * ⭐ **VIP Commander Badge:** Golden badge with dynamic particle glow mounted on the Main Menu, HUD, and Leaderboards.
  * 💰 **+25% Permanent Credit Boost:** Applies a +25% bonus to all mission debrief payouts and leaderboard rewards.
  * 🛸 **Daily Free Sovereign Vault:** One complimentary Sovereign Vault orbital drop every 24 hours.
  * 🔄 **3 Emergency Life-Support Retries:** When a vital hits 0% during critical mission phases, Five-Star Generals can trigger up to 3 emergency restarts (`retriesRemaining`) per mission to recover critical systems.

---

## 🎰 Orbital Supply Drops & Anti-Gambling Pity Protocol

An ethical, transparent orbital supply drop system (`/api/market/open-crate/route.ts`) designed for educational and fair gameplay:

* **3 Crate Tiers:**
  * 📦 **Standard Drop (150 MC):** Balanced drop yielding common-to-rare life-support supplies and credits.
  * 🔷 **Elite Pod (350 MC):** High-tier drop with enhanced rare/epic probabilities and a **100 MC automatic rebate** deposited directly to player wallet.
  * 👑 **Sovereign Vault (750 MC):** Maximum drop tier with **2x loot yields**, highest Legendary probabilities, and 1 daily free drop for Five-Star General VIPs.
* **Anti-Gambling Guaranteed Pity Counter (`jat_crate_pity_v1`):**
  * Tracks opens since last Legendary item.
  * **Hard Pity Guarantee:** Guarantees a top-tier **Legendary** item on every 5th open, completely preventing unfair streak losses.
  * Clear visual progress meter in the UI showing `X/5 opens until guaranteed Legendary`.

---

## 💳 Real Hosted Stripe Checkout Portal

Direct integration with Stripe Checkout (`src/app/api/stripe/checkout/route.ts`):

* **Real Hosted Checkout (`checkout.stripe.com`):** Direct server-side redirect to Stripe's hosted payment portal. No simulated client-side sandbox bypasses.
* **Curated Supply Packages:**
  * **Cadet Rations:** 500 MC ($0.99)
  * **Commander Supply Drop:** 1,200 MC ($1.99)
  * **Outpost Mega Bundle:** 3,500 MC ($4.99)
  * **Five-Star General Pass:** Lifetime VIP status + 1,000 MC ($4.99)
* **Secure Fulfillments & Verification:** Returns customers back to `/store?payment=success&session_id={CHECKOUT_SESSION_ID}` with automatic credit crediting and toast notifications.
* **Configured via `.env.local`:** Requires valid `STRIPE_SECRET_KEY` on the server; surfaces detailed diagnostic errors if misconfigured.

---

## 🃏 Tactical Operations Deck & Command Overrides

Replaces static button actions with a dynamic 5-card operations deck (`src/components/game/OperationsDeck.tsx` & `src/lib/operationsDeck.ts`):

* **Dynamic 5-Card Draw:** Hand draws 5 tactical operations from a 12-card balanced outpost operations deck each Sol.
* **Emergency Tactical Re-Roll:** Once per sol, commanders can re-shuffle their hand to fish for critical life-support actions.
* **Action Cooldowns:** High-impact operations (e.g., `Emergency Reactor Overcharge`, `Deep Core Oxygen Purge`) enforce cooldown turns to encourage strategic resource rotation.
* **Command Overrides & Crisis Emergency Cards:** Automatically draws specialized countermeasure cards into the hand during high-priority space weather hazards.

---

## 🐾 Companion Pet Hangar & Tactical Stim Boosts

Autonomous companions and synthetic stim boosters that enhance survival parameters (`src/components/game/PetHangarModal.tsx` & `src/components/game/LoadoutHangar.tsx`):

* **4 Companion Pet Archetypes:**
  * 🤖 **Rover-Bot Alpha:** Autonomous scout providing passive daily energy recovery and dust clearing.
  * 🦎 **Martian Tardigrade:** Bio-engineered organism offering passive radiation resistance and bio-dome boosts.
  * 🛰️ **Aero-Drone Echo:** Aerial scout providing early atmospheric hazard warnings and scouting bonuses.
  * 🐕 **Robo-Canine Buster:** Morale-stabilizing robotic companion that mitigates isolation stress.
* **Tactical Stim Loadouts:** Slot up to 2 active stims into your flight suit before launch (`Nanogel Infusion`, `Adrenaline Shot`, `Shield Booster`, `Oxygen Hyper-Filter`) to trigger passive shields and emergency health recovery.

---

## 📡 Electronic Warfare & PvP Sabotages

Competitive disruption mechanics for multiplayer and squad race engagements (`src/lib/sabotageEngine.ts` & `/api/sabotage/*`):

* **Tactical Electronic Countermeasures:**
  * ⚡ **EMP Jam:** Temporarily scrambles a rival cadet's solar relays, reducing power generation for 2 sols.
  * 📦 **Supply Intercept:** Redirects orbital supply drop telemetry to harvest bonus credits from rival sectors.
  * 📡 **Comms Spoof:** Generates phantom hazard alarms on the target's radar, taxing their crew morale.
  * ☀️ **Solar Blind:** Overloads external camera sensors during solar maximums.
* **Anti-Cheat Validation:** Sabotage triggers and cooldowns are validated server-side to prevent client spoofing.

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
  * **Full-Stack Deep Purge:** Calls `DELETE /api/profile?cadetId=...` which purges all server-side tables in Neon Postgres (`cadet_profiles`, `active_saves`, `leaderboard_entries`, `squad_rooms`, `player_wallets`, `player_inventory`).
  * **Client Local Reset:** Calls `resetBattlePassState()`, purging `jat_profile_v1`, `jat_battlepass_v1`, `jat_crate_pity_v1`, `jat_active_save_v1`, `jat_equipped_pet_v1`, and all cached credentials, instantly refreshing the game into a pristine state.

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

### Economy & Difficulty Scaling (`src/lib/constants.ts`)

| Difficulty Tier | Base Depletion Multiplier | Event Trigger Chance | Critical Escalation ($\le 20\%$) | Final Score Multiplier |
| :--- | :---: | :---: | :---: | :---: |
| **Space Cadet** | `0.7x` | `36%` (`0.45 * 0.8`) | `54%` (`1.5x`) | `1.0x` |
| **Mission Commander** | `1.0x` | `45%` (`0.45 * 1.0`) | `67.5%` (`1.5x`) | `1.5x` |
| **Mars Pioneer** | `1.4x` | `54%` (`0.45 * 1.2`) | `81%` (`1.5x`) | `2.0x` |

* **Base Per-Sol Depletion:** `-8⚡ Power`, `-6🫁 Oxygen`, `-3🛡️ Shielding`, `-1💪 Morale` (modulated inversely by crew morale).
* **Tactical Outpost Operations:** 8 life-support operations (`Run O₂ Generators`, `Boost Shields`, `Solar Panel Repair`, `Conserve Resources`, `Research Mission`, `Grow Food`, `Antenna Maintenance`, `Emergency Drill`).

---

## 🗄️ Dual-Tier Cloud & Local Storage Architecture

The storage adapter (`src/lib/storageAdapter.ts`) automatically detects its runtime environment:

1. **Cloud Tier (Neon Serverless Postgres):**
   * Connects via `@neondatabase/serverless` using `DATABASE_URL` or `POSTGRES_URL`.
   * Provisions tables automatically: `cadet_profiles`, `active_saves`, `leaderboard_entries`, `player_wallets`, `player_inventory`, and `squad_rooms`.
   * **Anti-Cheat Validation:** High scores submitted to the leaderboard are independently recalculated server-side from raw game vitals.
2. **Local Fallback Tier (`localStorage`):**
   * If database environment variables are not configured or network drops, the application falls back seamlessly to browser storage (`jat_profile_v1`, `jat_active_save_v1`, `jat_battlepass_v1`, `jat_crate_pity_v1`).
   * Guarantees 100% offline functionality with zero UI errors or setup friction.

---

## 🔊 Procedural Web Audio Sound Engine

* **Zero Copyright / Zero Downloads (`src/lib/sound.ts`):** Synthesizes retro-futuristic sound effects on the fly using the browser's native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`).
* **Browser Autoplay Compliant:** Unlocks audio lazily on the first user click to respect modern browser policies.
* **Sound Palette:** Crisp UI blips (`playClick`), power-up chimes (`playAction`), two-tone space klaxons (`playAlert`), victory fanfares (`playVictory`), and an optional filtered cosmic ambient hum.

---

## 🛰️ NASA & CSA Data Grounding

Every crisis event, radiation penalty, and educational fact in the simulation maps directly to official challenge resources:

| Dataset / API | Source | Records | In-Game Integration |
| :--- | :--- | :---: | :--- |
| **NASA DONKI Live** | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Live + 18 cached | Real-time solar flares (M/X Class) and CMEs streaming into the ticker and crisis generator. |
| **ISS RadLab** | [NASA ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | **12** | Absorbed radiation dose rates (`147.9–312.4 μGy/day`) from `DOSTEL` and `TEPC` calibrating radiation events. |
| **NASA OSDR** | [NASA OSDR](https://osdr.nasa.gov/bio/) | **16** | Peer-reviewed studies on bone density, DNA repair, and SANS vision powering research discoveries. |
| **NASA Image Library** | [NASA Images API](https://images-api.nasa.gov/) | **17+** | High-resolution Mars surface imagery from *Curiosity*, *Perseverance*, *Opportunity*, and *Spirit*. |
| **NASA Micro-Facts** | NASA JPL / ECLSS / HRP | **30** | Categorized STEM facts displayed in `NASAFactPopup` between sols. |

---

## 📂 Directory Structure

```text
junior-astronaut-trainer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── image-proxy/route.ts       # Secure IPv4 image streaming proxy
│   │   │   ├── leaderboard/route.ts       # Anti-cheat score verification & Neon ranking
│   │   │   ├── market/                    # Store purchases, crates, wallet, recycling
│   │   │   │   ├── open-crate/route.ts    # Orbital drop opening with pity counter
│   │   │   │   ├── recycle/route.ts       # 60% credit recycling protocol
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
│   │   ├── game/page.tsx                  # Mission runner, 3D Mars globe & GameProvider
│   │   ├── store/page.tsx                 # Full-screen Colony Supply Store & Outpost Logistics
│   │   ├── globals.css                    # Tailwind v4 theme tokens & animations
│   │   ├── layout.tsx                     # Root layout with typography & metadata
│   │   └── page.tsx                       # Command Center Main Menu & status ticker
│   ├── components/
│   │   ├── game/
│   │   │   ├── ActionPanel.tsx            # Outpost life-support operation controls
│   │   │   ├── ColonyStoreContent.tsx     # 4-tab Colony Store, VIP & Crates UI
│   │   │   ├── EndScreen.tsx              # Mission debrief, telemetry curve & certificate
│   │   │   ├── EventCard.tsx              # Space weather alert dialog & countermeasures
│   │   │   ├── GameBoard.tsx              # Outpost layout & phase coordinator
│   │   │   ├── GameProvider.tsx           # React Context + state machine bridge
│   │   │   ├── HUD.tsx                    # Vital gauges, Sol clock, VIP badge & Retries
│   │   │   ├── LeaderboardModal.tsx       # Top 25 verified global cadet rankings
│   │   │   ├── LiveTelemetryTicker.tsx    # Marquee NASA solar weather bar & dossier modal
│   │   │   ├── MainMenu.tsx               # Command Center portal & station navigation
│   │   │   ├── MarsGlobeSelector.tsx      # Interactive HTML5 3D Martian landing globe
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
│   ├── data/                              # Verified empirical NASA JSON datasets
│   └── lib/                               # Domain engine, battlePass, sound & storage
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
