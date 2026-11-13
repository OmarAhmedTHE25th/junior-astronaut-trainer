# 🚀 Junior Astronaut Mission Trainer

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026-E87040)](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)

A deterministic, turn-based Mars outpost survival simulator built for the **NASA International Space Apps Challenge 2026: Junior Astronaut Mission Trainer** (in collaboration with NASA and the Canadian Space Agency).

Players command a four-person Martian habitat across **30 sols**, balancing critical life-support telemetry (**Power**, **Oxygen**, **Radiation Shielding**, and **Crew Morale**) against real historical space weather events, radiation dose profiles, and space biology hazards derived from official NASA Open Data repositories.

---

## 📋 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Core Game Engine & State Machine](#-core-game-engine--state-machine)
- [NASA & CSA Data Grounding](#-nasa--csa-data-grounding)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
- [Accessibility & UX Engineering](#-accessibility--ux-engineering)
- [Roadmap](#-roadmap)
- [License & Attribution](#-license--attribution)

---

## 🏗️ Architectural Overview

The codebase enforces a strict separation between **framework-agnostic domain logic** (`src/lib/`), **strongly typed empirical datasets** (`src/data/`), and the **reactive UI presentation layer** (`src/app/` & `src/components/`).

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Presentation Layer (src/components/)              │
│  GameBoard.tsx • HUD.tsx • ActionPanel.tsx • EventCard.tsx • MarsView │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ Dispatches GameAction / Reads State
┌───────────────────────────────────▼───────────────────────────────────┐
│                   React State Bridge (GameProvider.tsx)               │
│        useReducer(gameReducer) + NASA Fact Queue Rotation             │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ Pure Function Transitions
┌───────────────────────────────────▼───────────────────────────────────┐
│                    Pure Domain Engine (src/lib/)                      │
│     gameEngine.ts (FSM Reducer) • events.ts • constants.ts • types.ts │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ Typed Synchronous Queries
┌───────────────────────────────────▼───────────────────────────────────┐
│                   Curated Data Layer (src/data/)                      │
│  donki-events.json • radlab-doses.json • space-biology.json • rovers  │
└───────────────────────────────────────────────────────────────────────┘
```

### Key Engineering Decisions
* **Zero-DOM Pure Functional Engine:** All simulation math, resource clamping (`[0, 100]`), morale scaling, difficulty multipliers, and win/loss evaluation live inside `src/lib/` with zero React or browser dependencies, making state transitions deterministic and trivially testable.
* **Offline-Resilient Static Data Caching:** Official NASA datasets (DONKI, RadLab, OSDR, Rover Raw Imagery) are curated and normalized into statically typed JSON modules under `src/data/`. This guarantees sub-millisecond query performance and eliminates runtime API rate-limiting, CORS failures, or key exposure in client bundles.
* **Zero-WebGL Reactive Outpost (`MarsView.tsx`):** Rather than shipping heavy 3D assets, the Martian habitat renders via hardware-accelerated inline SVGs whose visual state dynamically binds to simulation telemetry (e.g., solar array opacity scales with `power`, and protective dome luminescence activates when `shielding > 60%`).

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

* **Base Per-Sol Depletion:** `-8⚡ Power`, `-6🫁 Oxygen`, `-3🛡️ Shielding`, `-1💪 Morale` (modulated inversely by `getMoraleModifier(morale)` ranging from `0.75x` at low morale to `1.15x` at $\ge 80\%$).
* **Tactical Outpost Operations:** Players select 1 of 8 balanced actions per sol (`Run O₂ Generators`, `Boost Shields`, `Solar Panel Repair`, `Conserve Resources`, `Research Mission`, `Grow Food`, `Antenna Maintenance`, `Emergency Drill`).

---

## 🛰️ NASA & CSA Data Grounding

Every crisis event, radiation penalty, and educational fact in the simulation maps directly to official challenge resources:

| Dataset File | Official Source | Records | In-Game Integration |
| :--- | :--- | :---: | :--- |
| `src/data/donki-events.json` | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | **18** | Historical Solar Flares (`X28` 2003-11-04, `X8.7` 2024-05-14), Halo CMEs, and SEP storms. Event `intensity` (1–10) maps directly to crisis severity (1–3) and shield drain. |
| `src/data/radlab-doses.json` | [NASA ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | **12** | Absorbed radiation dose rates (`147.9–312.4 μGy/day`) recorded by `DOSTEL`, `TEPC`, `Liulin-5`, and `HERA` instruments across ISS modules to calibrate radiation spikes. |
| `src/data/space-biology.json` | [NASA OSDR](https://osdr.nasa.gov/bio/) | **16** | Peer-reviewed studies (`OSD-253` bone density, `OSD-352` DNA radiation response, `OSD-412` SANS vision) powering `Research Discovery` events and crew mitigation choices. |
| `src/data/mars-rover-photos.json` | [NASA Mars Raw Images](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | **17** | Metadata and raw image URLs from *Curiosity*, *Perseverance*, *Opportunity*, and *Spirit* across Gale, Jezero, Endeavour, and Gusev craters. |
| `src/data/nasa-facts.json` | NASA JPL / ISS ECLSS / HRP | **30** | Categorized STEM facts (`mars`, `radiation`, `life_support`, `food`, `power`, `exploration`) surfaced in `NASAFactPopup` between sols. |

---

## 📂 Directory Structure

```text
junior-astronaut-trainer/
├── src/
│   ├── app/
│   │   ├── about/page.tsx          # How-to-play guide & official NASA source citations
│   │   ├── game/page.tsx           # Mission briefing, difficulty selector & GameProvider mount
│   │   ├── globals.css             # Tailwind v4 @theme tokens & custom keyframe animations
│   │   ├── layout.tsx              # Root layout with Space Grotesk & Inter Google Fonts
│   │   └── page.tsx                # Landing page
│   ├── components/
│   │   ├── game/
│   │   │   ├── ActionPanel.tsx     # 8-action tactical command grid
│   │   │   ├── EndScreen.tsx       # Victory/Defeat modal, confetti & 1–5 star breakdown
│   │   │   ├── EventCard.tsx       # Severity-styled space weather & hazard alert dialog
│   │   │   ├── GameBoard.tsx       # Main simulation layout & phase orchestrator
│   │   │   ├── GameProvider.tsx    # React Context + useReducer state bridge
│   │   │   ├── HUD.tsx             # Sol counter, vital meters, morale & score header
│   │   │   ├── MarsView.tsx        # Telemetry-reactive SVG Martian landscape & habitat
│   │   │   ├── MissionLog.tsx      # Collapsible chronological audit log with resource deltas
│   │   │   └── NASAFactPopup.tsx   # Inter-sol educational fact modal
│   │   └── ui/
│   │       ├── Button.tsx          # Accessible multi-variant button primitive
│   │       ├── Modal.tsx           # Focus-safe dialog with Escape key listener
│   │       ├── ProgressBar.tsx     # ARIA meter with low-resource (<20%) warning pulse
│   │       └── Tooltip.tsx         # Hover/tap STEM vocabulary helper
│   ├── data/                       # Typed JSON datasets & query utilities (index.ts)
│   └── lib/                        # Pure TypeScript game engine, constants, events & types
├── next.config.ts                  # Next.js 16 configuration (Turbopack + Cache Components)
├── package.json
└── tsconfig.json                   # Strict TypeScript configuration with @/* path aliases
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

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

### Production Build & Linting

```bash
# Type-check and build optimized production bundle
npm run build

# Start production server
npm run start

# Run ESLint (Next.js Core Web Vitals + TypeScript rules)
npm run lint
```

---

## ♿ Accessibility & UX Engineering

Designed for young learners (`ages 8–14`) across classroom Chromebooks, tablets, and desktop browsers:
* **Semantic ARIA Telemetry:** Resource bars implement `role="meter"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`; crisis prompts use `role="alertdialog"`; the Mission Log uses `role="log"` with `aria-live="polite"`.
* **Touch-First Ergonomics:** All interactive buttons, action cards, and modal dismissals enforce a minimum `44×44px` touch target.
* **Scaffolded STEM Vocabulary:** Inline `Tooltip` components allow students to tap or hover technical terms without breaking gameplay flow, while every `EventCard` displays its direct NASA citation URL.

---

## 🗺️ Roadmap

- [ ] **Live DONKI Telemetry Sync:** Optional Next.js Route Handler (`/api/space-weather`) fetching live solar flare alerts from NASA's DONKI API with automatic fallback to `donki-events.json`.
- [ ] **Unlockable Rover Gallery:** Surface the 17 curated *Curiosity* and *Perseverance* raw images from `mars-rover-photos.json` as collectible field logs when players complete `Research Mission` actions.
- [ ] **Classroom Multi-Role Mode:** WebSocket/WebRTC session sync allowing students to split outpost responsibilities (*Power Engineer*, *Flight Surgeon*, *Science Officer*).

---

## 📄 License & Attribution

Built by **Omar Ahmed Abdel Hameed (Team ATT&CK)** for the **NASA International Space Apps Challenge 2026**.

All scientific datasets and imagery metadata are sourced from publicly available NASA Open Data portals ([DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/), [OSDR](https://osdr.nasa.gov/bio/), [Mars Exploration Program](https://mars.nasa.gov/)). This project is an educational hackathon submission and is not officially affiliated with or endorsed by NASA or the Canadian Space Agency.