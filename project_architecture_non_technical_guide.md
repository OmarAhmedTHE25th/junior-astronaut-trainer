### Project Overview: Junior Astronaut Mission Trainer

This project is an interactive Mars outpost survival simulator designed to teach young learners (`ages 8–14`) how real astronauts make life-or-death engineering trade-offs in deep space. Imagine a digital NASA Mission Control console where kids command a four-person habitat on Mars for **30 Martian days (sols)**, managing limited life-support systems against real historical solar storms and space hazards.

The project is built as a full-stack web application using **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS**, with **Web Audio API** for live synthesized sound effects and **Neon Serverless Postgres** for cloud saves, multi-cadet profiles, and a global leaderboard.

---

### The Main Ideas

1. **Every decision has a trade-off.** There are no "free" moves—generating oxygen burns power, boosting radiation shields drains oxygen and electricity, and neglecting crew morale slows down the whole base.
2. **Every crisis is grounded in real NASA data.** Solar flares, radiation spikes, biology discoveries, and rover photos come directly from official NASA Open Data portals rather than made-up sci-fi numbers.
3. **The game brain is completely separate from the screen.** All math, rules, and survival checks live in pure TypeScript files with zero screen/browser code, making the simulation predictable and bug-free.
4. **Zero-friction profiles for shared classrooms.** Kids and judges can jump in with one click, pick an astronaut specialty that changes gameplay, switch between multiple profiles on the same laptop, and print an official completion certificate.
5. **The leaderboard cannot be spoofed.** Instead of trusting a number sent by the browser, the server re-calculates the player's score using the official game rules before saving it to the database.

This runs directly in any modern web browser on laptops, school Chromebooks, or tablets, and degrades gracefully if the internet or cloud database is offline.

---

### Ways to Use the Project

#### 1. The Mission Operations Command Center (`/`)
When a player opens the landing page, they enter the main command hub (`MainMenu.tsx`) with four stations:
- **Start / Resume Mission:** Launches a new 30-sol expedition or immediately resumes an interrupted run right where the player left off.
- **Cadet Dossier:** Opens the player's astronaut profile, callsign editor, mission patch picker, specialty selector, career badges, and cloud recovery ID.
- **Global Leaderboard:** Displays the top 25 verified runs across all difficulties (`Cadet`, `Commander`, `Pioneer`).
- **Rover Gallery & Field Manual:** Lets students inspect 17 real Mars rover photographs and study the engineering trade-off handbook before launching.

#### 2. The Mars Outpost Simulator (`/game`)
Players pick a difficulty tier on the Mission Briefing screen and enter the 30-sol survival loop:
- **Choose an Action:** Pick 1 of 8 outpost operations each sol (`Run O₂ Generators`, `Boost Shields`, `Solar Panel Repair`, `Conserve Resources`, `Research Mission`, `Grow Food`, `Antenna Maintenance`, `Emergency Drill`).
- **Survive Space Weather:** Respond to incoming NASA DONKI solar flares, dust storms, meteorite impacts, and equipment malfunctions.
- **Learn Between Sols:** Read bite-sized NASA science facts between turns and earn an official printable diploma upon surviving Sol 30.

---

### How Each Part Works

#### 1. The Rulebook & Balance Sheet: `src/lib/constants.ts`
This file holds every tuning dial in the simulation:
- Starting vitals (`80%` Power, `85%` Oxygen, `70%` Shielding, `75%` Crew Morale).
- Daily passive drain (`-8` Power, `-6` Oxygen, `-3` Shielding per sol).
- Difficulty multipliers for **Space Cadet** (`0.7x` drain), **Mission Commander** (`1.0x` drain), and **Mars Pioneer** (`1.4x` drain).
- The exact resource gains and costs for all 8 player actions.

#### 2. The Pure Game Brain: `src/lib/gameEngine.ts`
`gameEngine.ts` is the deterministic finite state machine (`gameReducer`) that runs the entire simulation without touching the UI:
1. Receives the player's chosen action and applies their **Astronaut Specialty** bonus (for example, `+20%` solar repair power for Systems Engineers).
2. Scales resource gains and passive depletion based on **Crew Morale** (`>= 80%` grants a `1.15x` efficiency boost).
3. Checks if any vital vital dropped to `0%` (`gameover`) or if the crew survived past Sol 30 (`victory`).
4. Computes the authoritative final score (`calculateScore`) from sols survived, healthy resource bonuses, morale, and difficulty multipliers.

#### 3. The Space Weather Director: `src/lib/events.ts`
`events.ts` decides whether a crisis strikes at the end of a sol:
- Base crisis chance is `45%` (scaled by difficulty), jumping by `1.5x` if any vital falls into the danger zone (`<= 20%`).
- Pulls real historical solar storms from `donki-events.json` and biology studies from `space-biology.json`, translating their real-world intensity (`1–10`) into game severity (`1–3` stars) and shield damage.

#### 4. The Curated NASA Library: `src/data/`
Instead of risking live API rate limits or broken internet connections during classroom demos, official NASA records are stored as strongly typed JSON catalogs:
- **`donki-events.json` (18 records):** Historical X-class solar flares and coronal mass ejections from NASA DONKI.
- **`radlab-doses.json` (12 records):** ISS radiation dose rates (`μGy/day`) from NASA RadLab instruments.
- **`space-biology.json` (16 records):** Peer-reviewed spaceflight health studies from NASA OSDR.
- **`mars-rover-photos.json` (17 records):** Real surface photography from *Curiosity*, *Perseverance*, *Opportunity*, and *Spirit*.
- **`nasa-facts.json` (30 records):** Kid-friendly STEM facts surfaced between sols.

#### 5. The Living Martian Backdrop: `src/components/game/MarsView.tsx`
Rather than loading heavy 3D graphics, the Mars habitat is drawn with lightweight, reactive vector graphics (`SVG`) wired directly to live game telemetry:
- The solar panel arrays dim or brighten in real time based on your `power` percentage.
- A green protective force-field luminescence activates around the habitat dome whenever `shielding` is above `60%`.

#### 6. The Procedural Synthesizer: `src/lib/sound.ts`
The game ships with zero `.mp3` or `.wav` audio files. Instead, `sound.ts` uses the browser's built-in **Web Audio API** to generate every sound mathematically in real time:
- Crisp sine waves for button clicks, ascending triangle chords for actions, two-tone sawtooth klaxons for solar storm alerts, victory fanfares, and a subtle low-frequency cosmic hum in the background.

#### 7. Multi-Cadet Profiles & Specialties: `src/lib/profile.ts` and `ProfileModal.tsx`
`profile.ts` manages player identities without passwords or login walls:
- Generates a unique `cadetId`, editable callsign, mission patch avatar, and selectable **Astronaut Specialty** (*Systems Engineer*, *Astrobiologist*, *Radiation Physicist*, or *Mission Commander*) that grants real in-game perks.
- Maintains a multi-cadet roster in `localStorage` so siblings, students, or judges sharing one computer can switch profiles in one click, while automatically syncing progress to the cloud.
- Evaluates 5 unlockable career badges (*Solar Storm Survivor*, *30-Sol Veteran*, *Mars Pioneer*, *Chief Scientist*, *Iron Dome*) at the end of each run.

#### 8. The Cloud Storage Vault: `src/lib/storageAdapter.ts`
`storageAdapter.ts` connects the Next.js backend to **Neon Serverless Postgres**:
- On the first request, `ensureSchema()` automatically creates the three database tables (`cadet_profiles`, `active_saves`, and `leaderboard_entries`) if they do not already exist.
- If the app is run offline or without a `DATABASE_URL`, it seamlessly switches to an in-memory server store and browser `localStorage` so nothing ever crashes.

#### 9. The Serverless API Gateways: `src/app/api/`
Three Next.js Route Handlers bridge the browser UI to Neon Postgres:
- **`/api/profile`:** Saves and retrieves cadet dossiers and allows cross-device profile recovery via `cadetId`.
- **`/api/save`:** Handles debounced auto-saving (`500ms`) during active missions and deletes the save slot once a mission finishes.
- **`/api/leaderboard`:** Serves the top 25 rankings and validates every submitted run by running `calculateScore()` and `checkVictory()` on the server before writing to Postgres.

#### 10. The Cockpit Interface: `src/components/game/`
- **`GameProvider.tsx` & `GameBoard.tsx`:** Connects the pure `gameReducer` to React, triggers between-turn NASA fact popups, and runs background auto-saves.
- **`HUD.tsx` & `MissionLog.tsx`:** Displays the top vital meters (pulsing red below `20%`), active cadet specialty badge, audio toggle, pause menu trigger, and a chronological audit log of every resource change.
- **`EndScreen.tsx`:** Launches celebratory confetti, unlocks career badges, submits the run to the global leaderboard, and renders a print-ready **Mars Outpost Completion Certificate** (`@media print`).

---

### The Complete Sol-by-Sol Workflow

1. **Report for Duty.** The player opens the Command Center, customizes their Cadet Callsign and Specialty, and picks a difficulty tier.
2. **Initialize Outpost.** `createInitialState()` sets up Sol 1 with starting resources and opens the Action Panel.
3. **Execute an Operation.** The player selects 1 of 8 outpost actions; `gameReducer` applies specialty bonuses and morale multipliers.
4. **Auto-Save Telemetry.** `GameProvider` saves the updated state locally and syncs it to Neon Postgres in the background.
5. **End-of-Sol Depletion.** Mars consumes daily Power, Oxygen, and Shielding; if any vital hits `0%`, the mission ends immediately.
6. **Space Weather Roll.** `generateEvent()` rolls against NASA DONKI and OSDR datasets—either triggering an interactive crisis card or advancing cleanly to the next sol.
7. **Briefing Fact.** At the start of the new sol, `NASAFactPopup` teaches a real space science concept before unlocking the next turn.
8. **Victory & Certification.** Surviving all 30 sols triggers confetti, evaluates career badges, verifies the score on the server leaderboard, and unlocks the printable NASA Mission Completion Certificate.

---

### Running the Project

The application requires **Node.js 20+** and runs locally with zero configuration (using automatic local storage fallback unless `DATABASE_URL` is provided):

```bash
npm install
npm run dev
```

To verify a production build:

```bash
npm run build
npm run start
```

---

### Summary for a Non-Technical Person

Think of this project as a **NASA Mission Control Simulator in a box**:

- The **Flight Manual & Rules** are `constants.ts`.
- The **Flight Computer** calculating every resource trade-off is `gameEngine.ts`.
- The **Space Weather Radar** tracking real solar storms is `events.ts` and `src/data/`.
- The **Outpost Window** showing your solar panels and shield dome is `MarsView.tsx`.
- The **Control Room Soundboard** generating beeps and alarms without audio files is `sound.ts`.
- The **Astronaut ID Badge & Resume** is `profile.ts` and `ProfileModal.tsx`.
- The **Official Scorekeeper** preventing tampered high scores is `/api/leaderboard`.
- The **NASA Archive Vault** remembering profiles, saved runs, and rankings across devices is **Neon Postgres** (`storageAdapter.ts`).

Every turn teaches kids how engineering systems depend on one another—and if they keep their crew alive for 30 Martian days, they walk away with a verified global rank and a printable diploma.