// ─── Junior Astronaut Mission Trainer – Event Generation ───
// Pure functions. No React, no DOM.

import type { GameState, GameEvent, EventChoice } from './types';
import { EVENT_CHANCE, DIFFICULTY_SETTINGS, CRITICAL_THRESHOLD } from './constants';

// ── NASA Data Imports ───────────────────────────────────────
// These come from the data-curator's JSON files under src/data/.
// We import them as typed arrays; if the files aren't present yet
// the game can still compile — generateEvent() falls back to the
// built-in catalog below.

let donkiEvents: Array<{
  id: string;
  eventType: string;
  classType?: string;
  intensity: number;
  description: string;
  sourceUrl: string;
}> = [];

let spaceBiology: Array<{
  id: string;
  topic: string;
  fact: string;
  severity: number;
  mitigationStrategy: string;
  sourceUrl: string;
}> = [];

try {
  // Dynamic requires wrapped in try/catch so the module is self-contained
  // even before the data files are created.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  donkiEvents = require('../data/donki-events.json');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  spaceBiology = require('../data/space-biology.json');
} catch {
  // Data files not yet generated — fall back to built-in catalog.
}

// ── Helpers ─────────────────────────────────────────────────

let currentRng: () => number = Math.random;

/** Pseudo-random generator (switches to deterministic PRNG in Squad Mode) */
function random(): number {
  return currentRng();
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// ── Built-in Event Catalog ──────────────────────────────────

function buildSolarParticleEvent(): GameEvent {
  const donki = donkiEvents.length > 0 ? pick(donkiEvents) : null;
  const desc = donki
    ? `A ${donki.classType ?? donki.eventType} solar event has been detected! ${donki.description}`
    : 'NASA\'s DONKI system warns of incoming solar particles — your shields are being tested!';
  const source = donki?.sourceUrl ?? 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
  const intensity = donki?.intensity ?? 5;
  const severity: 1 | 2 | 3 = intensity >= 7 ? 3 : intensity >= 4 ? 2 : 1;

  const shieldCost = -(severity * 6);
  const choices: EventChoice[] = [
    {
      id: 'boost-shields',
      text: 'Divert power to boost radiation shields!',
      effects: { power: -(severity * 8), oxygen: 0, shielding: 15 },
      moraleEffect: -2,
      outcome: 'The extra shielding held! The crew is safe, but power reserves are lower.',
      scienceFact: 'NASA\'s DONKI system tracks real solar storms headed toward Earth and Mars in real time.',
    },
    {
      id: 'shelter-in-place',
      text: 'Order crew to shelter in the storm cellar.',
      effects: { power: 0, oxygen: -5, shielding: shieldCost },
      moraleEffect: -5,
      outcome: 'Everyone huddled in the shelter. Shields took a hit, but no one was hurt.',
      scienceFact: 'On a real Mars mission, astronauts would shelter behind water tanks — water is great at blocking radiation!',
    },
  ];

  return {
    id: `solar-particle-${Date.now()}`,
    title: '☀️ Solar Particle Event!',
    description: desc,
    severity,
    choices,
    nasaSource: source,
    icon: '☀️',
  };
}

function buildDustStormEvent(): GameEvent {
  const severity: 1 | 2 | 3 = random() < 0.3 ? 3 : random() < 0.6 ? 2 : 1;
  const powerLoss = -(severity * 7);

  return {
    id: `dust-storm-${Date.now()}`,
    title: '🌪️ Martian Dust Storm!',
    description:
      severity === 3
        ? 'A massive global dust storm like the one that ended Opportunity\'s mission is bearing down on your outpost!'
        : 'A regional dust storm is covering your solar panels in fine Martian dust.',
    severity,
    choices: [
      {
        id: 'hunker-down',
        text: 'Hunker down and wait it out.',
        effects: { power: powerLoss, oxygen: -3, shielding: 0 },
        moraleEffect: -4,
        outcome: 'You waited out the storm. Solar panels are dusty but intact.',
        scienceFact:
          'Mars dust storms can cover the entire planet! The 2018 global storm ended NASA\'s Opportunity rover mission after 15 years.',
      },
      {
        id: 'clean-panels',
        text: 'Send rover to clean panels during the storm.',
        effects: { power: Math.floor(powerLoss / 2), oxygen: -2, shielding: -5 },
        moraleEffect: 2,
        scoreEffect: 20,
        outcome: 'Risky move! The rover cleaned some panels — you lost less power but shields took a beating.',
        scienceFact:
          'Mars dust grains are very fine — about the size of particles in cigarette smoke — and they stick to everything!',
      },
    ],
    nasaSource: 'https://mars.nasa.gov/mars2020/weather/',
    icon: '🌪️',
  };
}

function buildEquipmentMalfunctionEvent(): GameEvent {
  return {
    id: `equipment-malfunction-${Date.now()}`,
    title: '⚠️ Equipment Malfunction!',
    description:
      'The life support system is beeping — one of the oxygen recyclers has jammed! You need to act fast.',
    severity: 2,
    choices: [
      {
        id: 'quick-fix',
        text: 'Attempt a quick patch using spare parts.',
        effects: { power: -5, oxygen: -8, shielding: 0 },
        moraleEffect: 3,
        scoreEffect: 15,
        outcome: 'Nice work, astronaut! The recycler is running again.',
        scienceFact:
          'The ISS has a system called ECLSS that recycles 90% of the crew\'s water — even from sweat and breath!',
      },
      {
        id: 'switch-backup',
        text: 'Switch to the backup system.',
        effects: { power: -10, oxygen: 0, shielding: 0 },
        moraleEffect: 0,
        outcome: 'The backup kicked in smoothly, but it draws more power than the primary.',
      },
    ],
    nasaSource: 'https://www.nasa.gov/mission_pages/station/research/experiments_category',
    icon: '⚠️',
  };
}

function buildCommunicationWindowEvent(): GameEvent {
  return {
    id: `comm-window-${Date.now()}`,
    title: '📡 Communication Window!',
    description:
      'Earth is in a good position — you have a clear communication window to talk to Mission Control!',
    severity: 1,
    choices: [
      {
        id: 'send-data',
        text: 'Upload all research data to Earth.',
        effects: { power: -6, oxygen: 0, shielding: 0 },
        scoreEffect: 40,
        moraleEffect: 8,
        outcome: 'Mission Control received your data! "Great work up there!" they radioed back.',
        scienceFact:
          'Messages between Earth and Mars take 4 to 24 minutes one way — so you can\'t have a real-time phone call!',
      },
      {
        id: 'request-guidance',
        text: 'Ask Mission Control for system diagnostics.',
        effects: { power: -4, oxygen: 0, shielding: 3 },
        moraleEffect: 5,
        outcome: 'Mission Control sent updated shield parameters. Nice boost!',
        scienceFact:
          'NASA\'s Deep Space Network has three giant antenna sites around the world so it can always talk to spacecraft.',
      },
    ],
    nasaSource: 'https://eyes.nasa.gov/dsn/dsn.html',
    icon: '📡',
  };
}

function buildResearchDiscoveryEvent(): GameEvent {
  const bio = spaceBiology.length > 0 ? pick(spaceBiology) : null;
  const fact = bio?.fact ?? 'Astronauts on the ISS experience bone density loss similar to osteoporosis patients on Earth.';
  const source = bio?.sourceUrl ?? 'https://osdr.nasa.gov/bio/';

  return {
    id: `research-discovery-${Date.now()}`,
    title: '🔬 Research Discovery!',
    description:
      'Your crew has made an exciting finding in the science lab! How do you want to use it?',
    severity: 1,
    choices: [
      {
        id: 'publish-findings',
        text: 'Document and broadcast findings for extra points.',
        effects: { power: -5, oxygen: -3, shielding: 0 },
        scoreEffect: 60,
        moraleEffect: 6,
        outcome: 'Your research paper will make headlines back on Earth!',
        scienceFact: fact,
      },
      {
        id: 'apply-locally',
        text: 'Use the findings to improve life support.',
        effects: { power: 3, oxygen: 5, shielding: 2 },
        moraleEffect: 3,
        outcome: 'Clever! You applied the research directly to improve your systems.',
        scienceFact: fact,
      },
    ],
    nasaSource: source,
    icon: '🔬',
  };
}

function buildMeteoriteImpactEvent(): GameEvent {
  return {
    id: `meteorite-impact-${Date.now()}`,
    title: '☄️ Meteorite Impact!',
    description:
      'Sensors detect an incoming meteorite on a collision course with the outpost! This is not a drill!',
    severity: 3,
    choices: [
      {
        id: 'activate-deflectors',
        text: 'Activate emergency deflector shields at full power!',
        effects: { power: -15, oxygen: -5, shielding: -8 },
        moraleEffect: -3,
        scoreEffect: 25,
        outcome: 'The deflectors diverted most of the debris! Some shield damage, but the habitat held.',
        scienceFact:
          'NASA\'s DART mission successfully changed an asteroid\'s orbit in 2022 — proving we can defend Earth!',
      },
      {
        id: 'evacuate-section',
        text: 'Seal and evacuate the exposed habitat section.',
        effects: { power: -5, oxygen: -12, shielding: -15 },
        moraleEffect: -8,
        outcome: 'You lost a habitat section, but everyone is alive. Shields are badly damaged.',
        scienceFact:
          'Mars gets hit by about 200 small meteorites every year — its thin atmosphere doesn\'t burn them up like Earth\'s does.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/planetary-defense/',
    icon: '☄️',
  };
}

// ── Event Catalog ───────────────────────────────────────────

type EventBuilder = () => GameEvent;

const EVENT_BUILDERS: EventBuilder[] = [
  buildSolarParticleEvent,
  buildDustStormEvent,
  buildEquipmentMalfunctionEvent,
  buildCommunicationWindowEvent,
  buildResearchDiscoveryEvent,
  buildMeteoriteImpactEvent,
];

// ── Public API ──────────────────────────────────────────────

/**
 * Decides whether a random event fires this sol and returns it (or null).
 *
 * • Probability = EVENT_CHANCE × difficulty multiplier.
 * • If any resource is critical (≤ CRITICAL_THRESHOLD) the chance doubles
 *   to keep the tension high.
 * • Already-used event *types* are deprioritised but not blocked — the
 *   timestamp-based IDs mean repeat types can still surface.
 */
export function generateEvent(state: GameState): GameEvent | null {
  if (state.weatherSeed !== undefined) {
    // Deterministic Mulberry32 seeded PRNG for identical squad weather sequence
    let s = ((state.weatherSeed + state.sol * 1337 + state.usedEventIds.length * 31) >>> 0) || 12345;
    currentRng = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  } else {
    currentRng = Math.random;
  }

  const diff = DIFFICULTY_SETTINGS[state.difficulty];
  let chance = EVENT_CHANCE * diff.eventChanceMultiplier;

  // Raise the stakes when a resource is critical
  const anyCritical =
    state.power <= CRITICAL_THRESHOLD ||
    state.oxygen <= CRITICAL_THRESHOLD ||
    state.shielding <= CRITICAL_THRESHOLD;
  if (anyCritical) {
    chance = Math.min(chance * 1.5, 0.95);
  }

  if (random() > chance) return null;

  // Pick a random event type, preferring unused ones
  const unusedBuilders = EVENT_BUILDERS.filter((_, i) => {
    // Event builders are keyed by their position — check if any usedEventId
    // starts with the builder's characteristic prefix.
    const prefixes = [
      'solar-particle',
      'dust-storm',
      'equipment-malfunction',
      'comm-window',
      'research-discovery',
      'meteorite-impact',
    ];
    return !state.usedEventIds.some((uid) => uid.startsWith(prefixes[i]));
  });

  const pool = unusedBuilders.length > 0 ? unusedBuilders : EVENT_BUILDERS;
  const builder = pick(pool);
  return builder();
}

/**
 * Returns the full catalog for testing / preview purposes.
 */
export function getAllEventBuilders(): EventBuilder[] {
  return [...EVENT_BUILDERS];
}
