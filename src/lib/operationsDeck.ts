// ─── Junior Astronaut Mission Trainer – Dynamic Per-Sol Operations Deck Engine ───
// Pure functions & deterministic seeded PRNG for tactical Mars operations drafting.

import type { GameState, ResourceType, CadetSpecialty } from './types';

export type OperationCategory =
  | 'life_support'
  | 'power_thermal'
  | 'structural_recon'
  | 'high_risk_gambit';

export interface ResourceDelta {
  power?: number;
  oxygen?: number;
  shielding?: number;
  morale?: number;
  score?: number;
}

export interface OperationCard {
  id: string;
  title: string;
  category: OperationCategory;
  categoryLabel: string;
  icon: string;
  description: string;
  flavorQuote: string;
  /** Costs subtracted when executing the operation */
  resourceCosts: ResourceDelta;
  /** Guaranteed positive yields applied on success */
  guaranteedEffects: ResourceDelta;
  /** Base risk chance percentage (0 - 100). 0 = 100% safe */
  riskChance: number;
  /** Hazard title rolled against */
  riskLabel?: string;
  /** Penalties applied if the risk roll fails */
  failurePenalty?: ResourceDelta;
  /** Failure outcome log description */
  failureMessage?: string;
  /** Sols this operation remains locked after use */
  cooldownSols: number;
  /** Min sol before this card can be drawn (for endless/deep survival) */
  minSol?: number;
  /** Evaluates if this card is an active crisis emergency draw */
  isCrisisEmergency?: (state: GameState, hasSpaceWeather?: boolean) => boolean;
}

export interface OperationRollResult {
  card: OperationCard;
  success: boolean;
  isCriticalSuccess: boolean;
  effectiveRisk: number;
  rollValue: number;
  netDeltas: ResourceDelta;
  moraleChange: number;
  scoreChange: number;
  logTitle: string;
  logDescription: string;
}

// ── Deterministic Seeded PRNG (Mulberry32) ───────────────────
export function createSeededRng(seed: number): () => number {
  let s = Math.floor(Math.abs(seed)) >>> 0;
  if (s === 0) s = 1337;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 24+ Tactical Operations Catalog ─────────────────────────

export const OPERATIONS_CATALOG: OperationCard[] = [
  // ── 1. LIFE SUPPORT & CRYO ──
  {
    id: 'sabatier-overclock',
    title: 'Sabatier Reactor Overclock',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '⚗️',
    description: 'Push nickel catalyst beds to maximum reaction temperature, combining atmospheric CO₂ and H₂ into water and breathable O₂.',
    flavorQuote: 'Exothermic Sabatier synthesis redlining at 450°C. High volume, high thermal strain.',
    resourceCosts: { power: 12 },
    guaranteedEffects: { oxygen: 22, score: 20 },
    riskChance: 25,
    riskLabel: '25% Sabatier Overheat Risk',
    failurePenalty: { power: -8, shielding: -5, morale: -4 },
    failureMessage: 'Catalyst bed overheated! Steam purge vented through auxiliary bypass, wasting power and scorching seals.',
    cooldownSols: 3,
    isCrisisEmergency: (state) => state.oxygen < 40,
  },
  {
    id: 'algae-biofilter-flush',
    title: 'Algae Bio-Filter Flush',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '🧪',
    description: 'Enrich spirulina bioreactors with hydroponic nutrient slurry to scrub cabin CO₂ and release fresh oxygen.',
    flavorQuote: 'Bioregenerative cultures are thriving. Cabin air smells noticeably crisper.',
    resourceCosts: { power: 6 },
    guaranteedEffects: { oxygen: 14, morale: 6, score: 15 },
    riskChance: 10,
    riskLabel: '10% Culture Die-Off Risk',
    failurePenalty: { oxygen: -5, morale: -5 },
    failureMessage: 'Bacterial contamination infected Tank-B! Emergency chlorine rinse killed the active culture.',
    cooldownSols: 2,
    isCrisisEmergency: (state) => state.oxygen < 50,
  },
  {
    id: 'subsurface-ice-extraction',
    title: 'Sub-Surface Ice Extraction',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '⛏️',
    description: 'Deploy ultrasonic heating probes into shallow permafrost deposits to melt water ice for electrolysis and shielding ballast.',
    flavorQuote: 'Extracting 98% pure glacial water ice from 2 meters beneath the Martian regolith.',
    resourceCosts: { power: 10 },
    guaranteedEffects: { oxygen: 14, shielding: 8, score: 25 },
    riskChance: 15,
    riskLabel: '15% Drill Bit Jam Risk',
    failurePenalty: { power: -6, shielding: -4 },
    failureMessage: 'High-density basalt fracture seized the rotary drill assembly! Motor windings tripped circuit breaker.',
    cooldownSols: 3,
    isCrisisEmergency: (state) => state.oxygen < 35 || state.shielding < 35,
  },
  {
    id: 'emergency-o2-bleed',
    title: 'Emergency O₂ Bleed',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '🫁',
    description: 'Rupture descent-stage reserve cryogenic oxygen spheres into central ventilation to reverse hypoxia.',
    flavorQuote: 'Venting non-renewable descent reserves. Desperate measure for critical cabin pressure drops.',
    resourceCosts: { power: 16 },
    guaranteedEffects: { oxygen: 30, score: 10 },
    riskChance: 30,
    riskLabel: '30% Tank Rupture Risk',
    failurePenalty: { oxygen: -8, shielding: -10, morale: -8 },
    failureMessage: 'Pressure relief valve jammed open! Cryogenic flash froze conduit, leaking precious O₂ into the vacuum.',
    cooldownSols: 4,
    isCrisisEmergency: (state) => state.oxygen < 30,
  },
  {
    id: 'atmospheric-scrubber-surge',
    title: 'Atmospheric Scrubber Surge',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '💨',
    description: 'Cycle amine absorption beds on an alternating heating/cooling loop to steadily scrub ambient carbon dioxide.',
    flavorQuote: 'Standard closed-loop life support cycle. Safe, predictable, zero gambling.',
    resourceCosts: { power: 5 },
    guaranteedEffects: { oxygen: 10, morale: 2, score: 10 },
    riskChance: 0,
    riskLabel: '0% Risk (Safe Maintenance)',
    cooldownSols: 2,
  },
  {
    id: 'cryo-stasis-cycle',
    title: 'Cryo-Stasis Chamber Cycle',
    category: 'life_support',
    categoryLabel: 'Life Support & Cryo',
    icon: '🧊',
    description: 'Induce mild hypothermic hibernation cycles across off-shift crew to slash metabolic oxygen consumption.',
    flavorQuote: 'Metabolic baseline reduced by 60%. Crew awakens disoriented but vital reserves are spared.',
    resourceCosts: { power: 4 },
    guaranteedEffects: { oxygen: 12, power: 8, morale: -4, score: 20 },
    riskChance: 15,
    riskLabel: '15% Thermal Shock Risk',
    failurePenalty: { morale: -8, oxygen: -4 },
    failureMessage: 'Rewarming protocol miscalibrated! Crew suffered mild hypothermic tremors and acute fatigue.',
    cooldownSols: 3,
  },

  // ── 2. POWER & THERMAL ──
  {
    id: 'dust-off-solar-sweep',
    title: 'Dust-Off Solar Array Sweep',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '🧹',
    description: 'Pulse electrostatic charge grids across photovoltaic arrays to dislodge fine iron-oxide Martian dust grains.',
    flavorQuote: 'Electrostatic repellor cleared 85% of panel surface obscuration. Insolation efficiency restored.',
    resourceCosts: { shielding: 6 },
    guaranteedEffects: { power: 22, score: 20 },
    riskChance: 20,
    riskLabel: '20% Dust Abrasion Risk',
    failurePenalty: { shielding: -8, power: -4 },
    failureMessage: 'Static discharge attracted airborne micro-grit, scoring panel coatings and reducing output.',
    cooldownSols: 2,
    isCrisisEmergency: (state) => state.power < 40,
  },
  {
    id: 'rtg-core-diversion',
    title: 'RTG Core Diversion',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '☢️',
    description: 'Reroute heat pipes directly from plutonium radioisotope thermoelectric generators into the primary habitat bus.',
    flavorQuote: 'Plutonium-238 decay heat redirected to life support. Thermal output surging, radiation shielding taxed.',
    resourceCosts: { shielding: 10 },
    guaranteedEffects: { power: 28, score: 25 },
    riskChance: 30,
    riskLabel: '30% Radiation Leak Risk',
    failurePenalty: { shielding: -12, morale: -6 },
    failureMessage: 'Radiator thermocouple solder failed! Trace gamma radiation spiked habitat exterior monitors.',
    cooldownSols: 3,
    isCrisisEmergency: (state) => state.power < 35,
  },
  {
    id: 'capacitor-dump',
    title: 'Capacitor Bank Dump',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '⚡',
    description: 'Discharge emergency graphene supercapacitor banks into the central electrical grid to overcome power brownouts.',
    flavorQuote: 'High-current flash discharge. Supplies instant energy buffer at the cost of life support cycle time.',
    resourceCosts: { oxygen: 6 },
    guaranteedEffects: { power: 18, score: 15 },
    riskChance: 10,
    riskLabel: '10% Surge Flashover Risk',
    failurePenalty: { power: -6, shielding: -4 },
    failureMessage: 'Harmonic resonance tripped auxiliary bus breaker, causing momentary electrical brownout.',
    cooldownSols: 2,
    isCrisisEmergency: (state) => state.power < 30,
  },
  {
    id: 'heater-grid-throttle',
    title: 'Heater Grid Throttle',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '🌡️',
    description: 'Lower peripheral habitat dome temperatures to 12°C, concentrating thermal warmth into crew sleeping quarters.',
    flavorQuote: 'Crew puts on thermal parkas. Power consumption plummets across secondary corridors.',
    resourceCosts: { morale: 4 },
    guaranteedEffects: { power: 12, oxygen: 4, score: 10 },
    riskChance: 0,
    riskLabel: '0% Risk (Safe Conservation)',
    cooldownSols: 2,
  },
  {
    id: 'geothermal-heat-sink',
    title: 'Geothermal Heat Sink Tap',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '🌋',
    description: 'Circulate closed-loop glycol coolant through deep volcanic magma fissures beneath Tharsis / Elysium crust.',
    flavorQuote: 'Harnessing residual Martian core heat. Steady thermoelectric wattage without solar dependency.',
    resourceCosts: { power: 6 },
    guaranteedEffects: { power: 20, shielding: 6, score: 30 },
    riskChance: 20,
    riskLabel: '20% Sub-Surface Tremor Risk',
    failurePenalty: { power: -8, shielding: -6 },
    failureMessage: 'Martian micro-quake pinched return heat pipe! Glycol loop required high-pressure flush.',
    cooldownSols: 3,
  },
  {
    id: 'superconducting-mag-pulse',
    title: 'Superconducting Magnetic Pulse',
    category: 'power_thermal',
    categoryLabel: 'Power & Thermal',
    icon: '🧲',
    description: 'Energize superconducting magnetic coils to establish an artificial localized magnetosphere over habitat modules.',
    flavorQuote: 'Deflecting high-energy galactic cosmic rays with active magnetic field lines.',
    resourceCosts: { oxygen: 8 },
    guaranteedEffects: { power: 16, shielding: 14, score: 35 },
    riskChance: 25,
    riskLabel: '25% Quench Collapse Risk',
    failurePenalty: { power: -10, shielding: -6 },
    failureMessage: 'Cryogenic coil boiled off coolant! Magnetic quench induced brief power drain.',
    cooldownSols: 3,
    isCrisisEmergency: (state, storm) => Boolean(storm || state.shielding < 40),
  },

  // ── 3. STRUCTURAL & RECON ──
  {
    id: 'regolith-sintering-patch',
    title: 'Regolith Sintering Patch',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '🧱',
    description: 'Direct high-power microwave lasers at raw Martian regolith, sintering it into dense basaltic radiation armor.',
    flavorQuote: 'Microwaved iron-rich sand fuses into solid ceramic shell. Radiation penetration drops significantly.',
    resourceCosts: { power: 12 },
    guaranteedEffects: { shielding: 24, score: 25 },
    riskChance: 15,
    riskLabel: '15% Thermal Stress Cracking',
    failurePenalty: { shielding: -6, power: -4 },
    failureMessage: 'Rapid cooling in thin atmosphere caused micro-fractures along exterior dome seam.',
    cooldownSols: 3,
    isCrisisEmergency: (state) => state.shielding < 40,
  },
  {
    id: 'rover-telemetry-salvage',
    title: 'Rover Telemetry Salvage',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '🔭',
    description: 'Dispatch autonomous exploration rover to scavenge spare parts, thermal insulation, and sensor boards from defunct orbiters.',
    flavorQuote: 'Rover recovered military-grade rad-shield tiles and intact solar concentrator diodes.',
    resourceCosts: { oxygen: 6 },
    guaranteedEffects: { power: 12, shielding: 12, score: 45 },
    riskChance: 20,
    riskLabel: '20% Wheel Jam Risk',
    failurePenalty: { power: -6, score: -20 },
    failureMessage: 'Rover drive actuator bogged down in soft dune sand! Remote recovery burned battery reserves.',
    cooldownSols: 2,
  },
  {
    id: 'orbital-beacon-ping',
    title: 'Orbital Beacon Telemetry Ping',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '📡',
    description: 'Align high-gain X-band dish with NASA Mars Reconnaissance Orbiter (MRO) to transmit science logs and receive Earth morale feeds.',
    flavorQuote: 'Bi-directional link established with Deep Space Network. Crew receives letters from home.',
    resourceCosts: { power: 8 },
    guaranteedEffects: { morale: 10, score: 60 },
    riskChance: 0,
    riskLabel: '0% Risk (Safe Comms)',
    cooldownSols: 3,
  },
  {
    id: 'airlock-seal-pressure-test',
    title: 'Airlock Seal Hyper-Test',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '🚪',
    description: 'Over-pressurize habitat airlock chambers with inert gas to detect microscopic micrometeoroid punctures.',
    flavorQuote: 'Ultrasonic acoustic sensors swept all seals. Structural integrity validated.',
    resourceCosts: { power: 5, oxygen: 4 },
    guaranteedEffects: { shielding: 16, morale: 5, score: 20 },
    riskChance: 10,
    riskLabel: '10% Gasket Blowout Risk',
    failurePenalty: { oxygen: -6, shielding: -4 },
    failureMessage: 'Polymer seal degraded under pressure! Minor cabin decompression before automatic hatch locked.',
    cooldownSols: 2,
    isCrisisEmergency: (state) => state.shielding < 45,
  },
  {
    id: 'drone-survey-sortie',
    title: 'Autonomous Drone Survey',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '🚁',
    description: 'Launch coaxial rotorcraft drone to scout nearby crater walls for sheltered lava tubes and exposed water ice.',
    flavorQuote: 'High-altitude aerial photography identified protected geological alcoves.',
    resourceCosts: { shielding: 4 },
    guaranteedEffects: { power: 8, oxygen: 8, score: 40 },
    riskChance: 15,
    riskLabel: '15% Dust Ingestion Crash',
    failurePenalty: { power: -6, score: -15 },
    failureMessage: 'Vortical dust devil clipped rotor blade during descent. Drone required emergency recovery.',
    cooldownSols: 2,
  },
  {
    id: 'whipple-shield-reinforce',
    title: 'Micrometeorite Whipple Baffle',
    category: 'structural_recon',
    categoryLabel: 'Structural & Recon',
    icon: '🛡️',
    description: 'Mount multi-layered Kevlar and Nextel fabric standoff blankets over exterior habitat modules to shatter incoming orbital debris.',
    flavorQuote: 'Double-wall Whipple shielding converts high-speed impacts into harmless particulate spray.',
    resourceCosts: { power: 8, oxygen: 4 },
    guaranteedEffects: { shielding: 20, score: 25 },
    riskChance: 10,
    riskLabel: '10% Baffle Jam Risk',
    failurePenalty: { shielding: -5, power: -4 },
    failureMessage: 'Tensioning bracket snapped during deployment, leaving one quadrant improperly anchored.',
    cooldownSols: 3,
    isCrisisEmergency: (state) => state.shielding < 35,
  },

  // ── 4. HIGH-RISK GAMBITS ──
  {
    id: 'unshielded-isotope-strip',
    title: 'Unshielded Isotope Strip-Mine',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '⚠️',
    description: 'Send EVA crew into an unshielded crater to manually strip decaying radioactive isotope batteries from crashed probe wreckage.',
    flavorQuote: 'High-yield plutonium isotope recovery. Extremely hazardous radiation exposure.',
    resourceCosts: { shielding: 18 },
    guaranteedEffects: { power: 34, score: 60 },
    riskChance: 40,
    riskLabel: '40% Radiation Overexposure',
    failurePenalty: { shielding: -16, morale: -10 },
    failureMessage: 'CRITICAL RADIATION LEAK! Crew EVA suits exceeded maximum permissible ionizing dosage.',
    cooldownSols: 4,
  },
  {
    id: 'deep-core-vent-tap',
    title: 'Deep Core Vent Tap',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '🌋',
    description: 'Detonate shaped seismic charges to breach subterranean geothermal gas pockets, routing subterranean vapors into life support.',
    flavorQuote: 'High-pressure volcanic venting tapped. If clean, oxygen and thermal reserves skyrocket.',
    resourceCosts: { shielding: 14, morale: 8 },
    guaranteedEffects: { oxygen: 32, power: 14, score: 70 },
    riskChance: 45,
    riskLabel: '45% Toxic Gas Inversion',
    failurePenalty: { oxygen: -14, shielding: -10, morale: -12 },
    failureMessage: 'SULFUR DIOXIDE CONTAMINATION! Volcanic gas poisoned scrubbers, forcing emergency atmospheric venting.',
    cooldownSols: 4,
    isCrisisEmergency: (state) => state.oxygen < 25,
  },
  {
    id: 'orbital-supply-beacon',
    title: 'Orbital Supply Beacon Drop',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '📦',
    description: 'Broadcast high-priority emergency distress beacon to orbital prepositioned cargo pods for an unguided retro-rocket drop.',
    flavorQuote: 'Cargo pod de-orbits without aerodynamic guidance. Miraculous bounty if it hits landing zone.',
    resourceCosts: { morale: 10 },
    guaranteedEffects: { power: 16, oxygen: 16, shielding: 16, score: 50 },
    riskChance: 35,
    riskLabel: '35% Debris Scatter / Crash',
    failurePenalty: { shielding: -12, power: -8 },
    failureMessage: 'DROPPED CRATE CRASHED HARD! Parachute failed to deploy in thin atmosphere, destroying contents.',
    cooldownSols: 4,
  },
  {
    id: 'reactor-coolant-bypass',
    title: 'Reactor Coolant Bypass',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '⚡',
    description: 'Bypass primary fission reactor safety interlocks, over-driving core neutron flux to squeeze massive emergency electrical output.',
    flavorQuote: 'Core neutron flux running at 140% nominal. Alarm klaxons blaring, massive electrical output.',
    resourceCosts: { oxygen: 12 },
    guaranteedEffects: { power: 36, score: 65 },
    riskChance: 50,
    riskLabel: '50% Core Scram Failure',
    failurePenalty: { power: -18, shielding: -15, morale: -10 },
    failureMessage: 'AUTOMATIC EMERGENCY CORE SCRAM! Safety fuses melted and primary bus tripped into safe-mode.',
    cooldownSols: 4,
    isCrisisEmergency: (state) => state.power < 25,
  },
  {
    id: 'solar-flare-harvesting',
    title: 'Solar Flare Induction Harvesting',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '🔥',
    description: 'Lower protective magnetic deflectors during an active DONKI solar storm to funnel energized solar protons into capacitor banks.',
    flavorQuote: 'Directly absorbing the fury of a solar coronal mass ejection. Madness, but incredible power if it holds.',
    resourceCosts: { shielding: 20 },
    guaranteedEffects: { power: 40, score: 85 },
    riskChance: 50,
    riskLabel: '50% Severe EMP Flashover',
    failurePenalty: { shielding: -20, power: -14, morale: -10 },
    failureMessage: 'ELECTROMAGNETIC PULSE CASCADE! Grounding rods vaporized, frying transformer banks.',
    cooldownSols: 4,
    isCrisisEmergency: (_state, storm) => Boolean(storm),
  },
  {
    id: 'experimental-ion-burn',
    title: 'Experimental Ion Thruster Burn',
    category: 'high_risk_gambit',
    categoryLabel: 'High-Risk Gambit',
    icon: '🚀',
    description: 'Fire stationary descent-stage xenon ion thrusters into overhead dust clouds to clear localized atmosphere and charge exterior shields.',
    flavorQuote: 'Ion exhaust ionization creates an energized plasma envelope above the habitat dome.',
    resourceCosts: { oxygen: 16 },
    guaranteedEffects: { shielding: 28, power: 20, score: 90 },
    riskChance: 45,
    riskLabel: '45% Magnetic Nozzle Failure',
    failurePenalty: { shielding: -14, power: -10, morale: -8 },
    failureMessage: 'Xenon feed valve suffered magnetic choke, back-firing plasma into descent cradle.',
    cooldownSols: 4,
    minSol: 15,
  },
];

// ── Context-Aware Weight Calculation ────────────────────────

export function calculateOperationWeight(
  card: OperationCard,
  state: GameState,
  hasSpaceWeather: boolean
): number {
  let weight = 100;

  // 1. Oxygen Crisis Boost
  if (state.oxygen < 35 && card.category === 'life_support') {
    weight += 300;
  } else if (state.oxygen < 50 && card.category === 'life_support') {
    weight += 150;
  }

  // 2. Power Crisis Boost
  if (state.power < 35 && card.category === 'power_thermal') {
    weight += 300;
  } else if (state.power < 50 && card.category === 'power_thermal') {
    weight += 150;
  }

  // 3. Shielding / Solar Storm Boost
  if ((state.shielding < 35 || hasSpaceWeather) && card.category === 'structural_recon') {
    weight += 280;
  } else if (hasSpaceWeather && card.id === 'solar-flare-harvesting') {
    weight += 350;
  }

  // 4. Endless Tournament Mode (Sol > 30) High-Risk Gambits Boost
  if (state.isEndlessTournament && state.sol > 30 && card.category === 'high_risk_gambit') {
    weight += 250;
  }

  // 5. Emergency Draw Trigger
  if (card.isCrisisEmergency && card.isCrisisEmergency(state, hasSpaceWeather)) {
    weight += 400;
  }

  return weight;
}

// ── Draw 5 Distinct Operations for the Current Sol ──────────

export function drawSolOperations(
  state: GameState,
  rngSeed?: number,
  overrideCount = 0
): { hand: OperationCard[]; hasEmergencyDraw: boolean } {
  // Compute deterministic seed from tournament/squad seed, current Sol, and re-roll count
  const baseSeed =
    rngSeed !== undefined
      ? rngSeed
      : state.tournamentRngSeed || state.weatherSeed || 884129;

  // Deterministic seed formula guaranteed identical for identical match seeds
  const drawSeed = Math.abs(baseSeed + state.sol * 9973 + overrideCount * 17929);
  const rng = createSeededRng(drawSeed);

  const currentCooldowns = state.operationCooldowns || {};
  const hasSpaceWeather = Boolean(
    state.activeEvent?.title?.toLowerCase().includes('solar') ||
    state.activeEvent?.description?.toLowerCase().includes('cme') ||
    (state.weatherSeed && (state.weatherSeed + state.sol) % 3 === 0)
  );

  // Filter out cards currently on cooldown or locked by minSol
  const availablePool = OPERATIONS_CATALOG.filter((card) => {
    const cooldownExpiresAt = currentCooldowns[card.id];
    if (cooldownExpiresAt && cooldownExpiresAt > state.sol) {
      return false; // Still on cooldown
    }
    if (card.minSol && state.sol < card.minSol) {
      return false;
    }
    return true;
  });

  // Fallback: If pool is less than 5 due to heavy cooldowns, relax cooldowns
  const eligiblePool = availablePool.length >= 5 ? availablePool : OPERATIONS_CATALOG;

  // Calculate weighted pool
  const weightedPool = eligiblePool.map((card) => ({
    card,
    weight: calculateOperationWeight(card, state, hasSpaceWeather),
  }));

  const selectedCards: OperationCard[] = [];
  const chosenIds = new Set<string>();

  // Draw 5 distinct cards weighted by urgency
  while (selectedCards.length < 5 && weightedPool.length > chosenIds.size) {
    const unpicked = weightedPool.filter((item) => !chosenIds.has(item.card.id));
    if (unpicked.length === 0) break;

    const totalWeight = unpicked.reduce((sum, item) => sum + item.weight, 0);
    let target = rng() * totalWeight;

    for (const item of unpicked) {
      target -= item.weight;
      if (target <= 0) {
        selectedCards.push(item.card);
        chosenIds.add(item.card.id);
        break;
      }
    }
  }

  // Final safety check: fill with any remaining if needed
  if (selectedCards.length < 5) {
    for (const card of eligiblePool) {
      if (!chosenIds.has(card.id)) {
        selectedCards.push(card);
        chosenIds.add(card.id);
        if (selectedCards.length === 5) break;
      }
    }
  }

  const hasEmergencyDraw = selectedCards.some(
    (c) => c.isCrisisEmergency && c.isCrisisEmergency(state, hasSpaceWeather)
  );

  return {
    hand: selectedCards,
    hasEmergencyDraw,
  };
}

// ── Resolve an Operation with Risk Rolls & Modifiers ─────────

export function resolveOperation(
  state: GameState,
  operationId: string,
  rngSeed?: number,
  activePetId?: string,
  activeBoosts: string[] = []
): OperationRollResult {
  const card = OPERATIONS_CATALOG.find((c) => c.id === operationId) || OPERATIONS_CATALOG[0];

  // Base risk
  let effectiveRisk = card.riskChance;

  // 1. Astronaut Role / Specialty Modifiers
  const specialty: CadetSpecialty = state.specialty || 'commander';
  if (specialty === 'engineer' && card.category === 'power_thermal') {
    effectiveRisk = Math.max(0, effectiveRisk - 10);
  } else if (specialty === 'biologist' && card.category === 'life_support') {
    effectiveRisk = Math.max(0, effectiveRisk - 10);
  } else if (specialty === 'physicist' && (card.category === 'structural_recon' || card.category === 'high_risk_gambit')) {
    effectiveRisk = Math.max(0, effectiveRisk - 10);
  } else if (specialty === 'commander') {
    effectiveRisk = Math.max(0, effectiveRisk - 5);
  }

  // 2. Equipped Companion Pet Modifiers
  if (activePetId) {
    const petKey = activePetId.toLowerCase();
    if (petKey.includes('cat') && card.category === 'structural_recon') {
      effectiveRisk = Math.max(0, effectiveRisk - 8);
    } else if (petKey.includes('gecko') && card.category === 'life_support') {
      effectiveRisk = Math.max(0, effectiveRisk - 8);
    } else if (petKey.includes('falcon') && card.category === 'power_thermal') {
      effectiveRisk = Math.max(0, effectiveRisk - 8);
    } else if (petKey.includes('tardigrade') && card.category === 'high_risk_gambit') {
      effectiveRisk = Math.max(0, effectiveRisk - 10);
    }
  }

  // 3. Tactical Stim Boost Modifiers
  if (activeBoosts.includes('rad_shield_matrix') && card.riskLabel?.toLowerCase().includes('radiation')) {
    effectiveRisk = 0; // Radiation Shield Matrix negates radiation hazards
  }
  if (activeBoosts.includes('nano_repair_paste') && card.category === 'structural_recon') {
    effectiveRisk = 0; // Nano Repair Paste guarantees structural success
  }

  // 4. Deterministic Risk Roll (Mulberry32)
  const baseSeed =
    rngSeed !== undefined
      ? rngSeed
      : state.tournamentRngSeed || state.weatherSeed || 991823;
  const rollSeed = Math.abs(baseSeed + state.sol * 3889 + operationId.length * 719);
  const rng = createSeededRng(rollSeed);
  const rollValue = Math.round(rng() * 100);

  const isFailed = effectiveRisk > 0 && rollValue < effectiveRisk;
  const isCriticalSuccess = !isFailed && rollValue >= 92;

  let netDeltas: ResourceDelta = {
    power: (card.guaranteedEffects.power || 0) - (card.resourceCosts.power || 0),
    oxygen: (card.guaranteedEffects.oxygen || 0) - (card.resourceCosts.oxygen || 0),
    shielding: (card.guaranteedEffects.shielding || 0) - (card.resourceCosts.shielding || 0),
    morale: (card.guaranteedEffects.morale || 0) - (card.resourceCosts.morale || 0),
    score: (card.guaranteedEffects.score || 0) - (card.resourceCosts.score || 0),
  };

  let moraleChange = netDeltas.morale || 0;
  let scoreChange = netDeltas.score || 0;
  let logTitle = card.title;
  let logDescription = card.description;

  if (isFailed && card.failurePenalty) {
    // Failure outcome
    netDeltas = {
      power: (netDeltas.power || 0) + (card.failurePenalty.power || 0),
      oxygen: (netDeltas.oxygen || 0) + (card.failurePenalty.oxygen || 0),
      shielding: (netDeltas.shielding || 0) + (card.failurePenalty.shielding || 0),
      morale: (netDeltas.morale || 0) + (card.failurePenalty.morale || 0),
      score: Math.max(0, (netDeltas.score || 0) + (card.failurePenalty.score || 0)),
    };
    moraleChange = (card.failurePenalty.morale || -5);
    logTitle = `⚠️ ${card.title} (FAILURE)`;
    logDescription = card.failureMessage || 'Operation risk roll failed. Secondary systems damaged.';
  } else if (isCriticalSuccess) {
    // Critical Success bonus: +25% yields
    netDeltas.power = netDeltas.power && netDeltas.power > 0 ? Math.round(netDeltas.power * 1.3) : netDeltas.power;
    netDeltas.oxygen = netDeltas.oxygen && netDeltas.oxygen > 0 ? Math.round(netDeltas.oxygen * 1.3) : netDeltas.oxygen;
    netDeltas.shielding = netDeltas.shielding && netDeltas.shielding > 0 ? Math.round(netDeltas.shielding * 1.3) : netDeltas.shielding;
    scoreChange = Math.round(scoreChange * 1.5) + 25;
    moraleChange += 4;
    logTitle = `🌟 ${card.title} (CRITICAL SUCCESS)`;
    logDescription = `${card.description} Maximum output achieved under optimal Martian atmospheric alignment!`;
  }

  // Active pet yield boosts
  if (activePetId) {
    const petKey = activePetId.toLowerCase();
    if (petKey.includes('cat') && netDeltas.oxygen && netDeltas.oxygen > 0) {
      netDeltas.oxygen = Math.round(netDeltas.oxygen * 1.15); // +15% O2 Scavenge
    }
  }

  return {
    card,
    success: !isFailed,
    isCriticalSuccess,
    effectiveRisk,
    rollValue,
    netDeltas,
    moraleChange,
    scoreChange,
    logTitle,
    logDescription,
  };
}
