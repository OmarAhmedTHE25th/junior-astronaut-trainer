# 🚀 Junior Astronaut Mission Trainer

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Neon Postgres](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026-E87040)](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)

A deterministic, turn-based Mars outpost survival simulator built for the **NASA International Space Apps Challenge 2026: Junior Astronaut Mission Trainer** (in collaboration with NASA and the Canadian Space Agency).

Players command a four-person Martian habitat across **30 sols**, balancing critical life-support telemetry (**Power**, **Oxygen**, **Radiation Shielding**, and **Crew Morale**) against real historical space weather events, radiation dose profiles, and space biology hazards derived from official NASA Open Data repositories.

---

## 📋 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [New Major Features & Engineering Upgrades](#-new-major-features--engineering-upgrades)
- [Core Game Engine & State Machine](#-core-game-engine--state-machine)
- [NASA & CSA Data Grounding](#-nasa--csa-data-grounding)
- [Multi-Cadet Profiles & Astronaut Specialties](#-multi-cadet-profiles--astronaut-specialties)
- [Dual-Tier Cloud & Local Storage Architecture](#-dual-tier-cloud--local-storage-architecture)
- [Procedural Web Audio Sound Engine](#-procedural-web-audio-sound-engine)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
- [Accessibility & UX Engineering](#-accessibility--ux-engineering)
- [License & Attribution](#-license--attribution)

---

## 🏗️ Architectural Overview

The codebase enforces a strict separation between **framework-agnostic domain logic** (`src/lib/`), **strongly typed empirical datasets** (`src/data/`), and the **reactive UI presentation layer** (`src/app/` & `src/components/`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Presentation Layer (src/components/)                  │
│  MainMenu • HUD • ActionPanel • EventCard • MarsGlobeSelector • EndScreen   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Dispatches GameAction / Reads State
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     React State Bridge (GameProvider.tsx)                   │
│        useReducer(gameReducer) + Telemetry Logger + Cloud Auto-Save         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pure Mathematical State Transitions
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      Pure Domain Engine (src/lib/)                          │
│     gameEngine.ts (FSM Reducer) • events.ts • constants.ts • types.ts       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Typed Synchronous Queries & APIs
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Data & Telemetry Layer (src/data/ & APIs)               │
│  /api/nasa-live • /api/rover-photos • /api/image-proxy • Neon Postgres DB   │
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
* **Return to Command Center Button:** Enables one-click navigation back to the main menu without page reloads.

---

## ⚙️ Core Game Engine & State Machine

Each Martian day (**Sol**) executes a deterministic finite state machine managed by `gameReducer` in `src/lib/gameEngine.ts`:

```
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
* **Tactical Outpost Operations:** Players select 1 of 8 balanced actions per sol (`Run O₂ Generators`, `Boost Shields`, `Solar Panel Repair`, `Conserve Resources`, `Research Mission`, `Grow Food`, `Antenna Maintenance`, `Emergency Drill`).

---

## 👨‍🚀 Multi-Cadet Profiles & Astronaut Specialties

Built specifically for shared classroom laptops, Chromebooks, and science fair judging stations:

* **Zero-Friction Authentication:** No passwords, emails, or accounts required. Generates an instant UUID with customizable callsigns (e.g. `CDR-NOVA-01`) and patch avatars (`🚀`, `🛸`, `🪐`, `🛰️`, `👨‍🚀`, `👩‍🚀`).
* **Multi-Cadet Device Switcher:** Switch between active student profiles in one click or add new classmates on the same device.
* **4 Astronaut Disciplines:**
  * 🔧 **Systems Engineer:** +20% power gained from Solar Panel Cleaning.
  * 🌱 **Astrobiologist:** +20% oxygen gained from Hydroponic Greenhouse farming.
  * 🛡️ **Shielding Physicist:** +25% shielding restored during Shield Boost operations.
  * 🎖️ **Mission Commander:** +5 crew morale preserved every sol.
* **Career Honors & Badges:** Unlockable achievements including *Solar Storm Survivor*, *30-Sol Veteran*, *Master of Mars*, *Resource Conserver*, and *High Morale Officer*.
* **Data Erasure & Privacy:** Instant one-click wipe of all local and cloud data to ensure GDPR and classroom privacy compliance.

---

## 🗄️ Dual-Tier Cloud & Local Storage Architecture

The storage adapter (`src/lib/storageAdapter.ts`) automatically detects its runtime environment:

1. **Cloud Tier (Neon Serverless Postgres):**
   * Connects via `@neondatabase/serverless` using `DATABASE_URL` or `POSTGRES_URL`.
   * Automatically provisions tables on cold start: `cadet_profiles`, `active_saves`, and indexed `leaderboard_entries`.
   * **Anti-Cheat Validation:** High scores submitted to the leaderboard are independently recalculated server-side from raw game vitals.
2. **Local Fallback Tier (`localStorage`):**
   * If database environment variables are not configured or the network drops, the application falls back seamlessly to browser storage (`jat_profile_v1`, `jat_active_save_v1`, `jat_cadet_roster_v1`).
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
│   │   │   ├── image-proxy/route.ts    # Secure IPv4 image streaming proxy
│   │   │   ├── leaderboard/route.ts    # Anti-cheat score verification & Neon ranking
│   │   │   ├── nasa-live/route.ts      # 15-min ISR live DONKI solar flare ingestion
│   │   │   ├── profile/route.ts        # Cloud cadet profile upsert & sync
│   │   │   ├── rover-photos/route.ts   # Mars Rover photography API
│   │   │   └── save/route.ts           # Debounced cloud mission auto-save
│   │   ├── game/page.tsx               # Briefing, 3D Mars globe & GameProvider mount
│   │   ├── globals.css                 # Tailwind v4 theme tokens & animations
│   │   ├── layout.tsx                  # Root layout with typography & metadata
│   │   └── page.tsx                    # Command Center Main Menu & status ticker
│   ├── components/
│   │   ├── game/
│   │   │   ├── ActionPanel.tsx         # 8-action tactical life-support controls
│   │   │   ├── EndScreen.tsx           # Mission debrief, telemetry curve & printable certificate
│   │   │   ├── EventCard.tsx           # Space weather alert dialog & countermeasures
│   │   │   ├── GameBoard.tsx           # Outpost layout & phase coordinator
│   │   │   ├── GameProvider.tsx        # React Context + useReducer state bridge
│   │   │   ├── HUD.tsx                 # Vital gauges, Sol counter & Telemetry button
│   │   │   ├── LeaderboardModal.tsx    # Top 25 verified global cadet rankings
│   │   │   ├── LiveTelemetryTicker.tsx # Marquee NASA solar weather bar & dossier modal
│   │   │   ├── MainMenu.tsx            # Command Center portal & station navigation
│   │   │   ├── MarsGlobeSelector.tsx   # Interactive HTML5 3D Martian landing globe
│   │   │   ├── ProfileModal.tsx        # Multi-cadet switcher, callsigns & badges
│   │   │   ├── RoverGalleryModal.tsx   # NASA Mars rover photo gallery & photo inspector
│   │   │   ├── TelemetryChart.tsx      # Pure SVG multi-series vital analytics curves
│   │   │   └── NASAFactPopup.tsx       # Educational inter-sol micro-learning dialog
│   │   └── ui/
│   │       ├── Button.tsx              # Accessible multi-variant button primitive
│   │       ├── Modal.tsx               # Focus-safe dialog with Escape key trap
│   │       └── ProgressBar.tsx         # ARIA meter with low-resource warning pulses
│   ├── data/                           # Verified empirical NASA JSON datasets
│   └── lib/                            # Game engine, sound, profile, storage & types
├── PROJECT_GUIDE.md                    # In-depth non-technical educator & student guide
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

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

3. **(Optional) Configure Database & NASA API Keys in `.env.local`:**
   ```env
   # Neon Serverless Postgres (optional: falls back to localStorage automatically)
   DATABASE_URL=postgresql://user:password@ep-sample.neon.tech/neondb?sslmode=require

   # NASA API Key (optional: defaults to NASA DEMO_KEY)
   NASA_API_KEY=DEMO_KEY
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
