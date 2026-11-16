// ─── Junior Astronaut Mission Trainer – Planetary Cartridges Registry ───
// Modular cartridge architecture for all 9 celestial worlds:
// Mars, Earth, Venus, Mercury, Jupiter, Saturn, Uranus, Neptune, and Planet X.

export type PlanetId =
  | 'mars'
  | 'earth'
  | 'venus'
  | 'mercury'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'planet_x';

export type WeatherEffectType =
  | 'dust'
  | 'debris'
  | 'acid'
  | 'solar_flare'
  | 'lightning'
  | 'rings'
  | 'frost'
  | 'supersonic'
  | 'glitch';

export interface PlanetMetricDef {
  key: string;
  name: string;
  shortName?: string;
  icon: string;
  min: number;
  max: number;
  defaultValue: number;
  unit: string;
  dangerLow?: number;
  dangerHigh?: number;
  color: string;
  barColor: string;
  description: string;
}

export interface PlanetLandingLocation {
  id: string;
  name: string;
  tagline: string;
  description: string;
  perksSummary: string;
  bonusStats: {
    power?: number;
    oxygen?: number;
    shielding?: number;
    metricBonus?: Record<string, number>;
  };
  pinColor: string;
  icon: string;
}

/**
 * Format a bonus stat percentage with explicit plus/minus sign (prevents +- bugs).
 */
export function formatBonusStat(val: number, icon = ''): string {
  if (!val) return '';
  return `${val > 0 ? `+${val}` : `${val}`}%${icon}`;
}

export interface PlanetExclusiveAction {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'survival' | 'engineering' | 'science' | 'special';
  icon: string;
  cooldownSols: number;
  resourceCosts: {
    power?: number;
    oxygen?: number;
    shielding?: number;
    customMetricCost?: Record<string, number>;
  };
  guaranteedEffects: {
    power?: number;
    oxygen?: number;
    shielding?: number;
    morale?: number;
    score?: number;
    customMetricDelta?: Record<string, number>;
  };
  flavorQuote?: string;
  mechanicNote?: string;
}

export interface PlanetExclusiveItem {
  slug: string;
  name: string;
  icon: string;
  priceCredits: number;
  description: string;
  tacticalEffect: string;
  category: 'consumable' | 'tech';
}

export interface PlanetTheme {
  bgGradient: string;
  bgDark: string;
  primaryColor: string;
  accentHex: string;
  borderColor: string;
  borderGlow: string;
  weatherEffect: WeatherEffectType;
  cardBg: string;
  skyHue: string;
}

export interface PlanetDayUnit {
  singular: string;
  plural: string;
}

export interface PlanetCartridge {
  id: PlanetId;
  order: number | 'X';
  sector: string;
  name: string;
  tagline: string;
  subtitle: string;
  description: string;
  dayUnit: PlanetDayUnit;
  image: string;
  requiredPrevScore: number;
  unlockTargetScore: number;
  prevPlanetId?: PlanetId;
  nextPlanetId?: PlanetId;
  secret?: boolean;
  theme: PlanetTheme;
  locations: PlanetLandingLocation[];
  customMetrics: [PlanetMetricDef, PlanetMetricDef];
  actions: PlanetExclusiveAction[];
  planetItems: PlanetExclusiveItem[];
  signatureMechanic: {
    name: string;
    description: string;
    hazardAlert: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANETARY CARTRIDGE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const PLANET_CARTRIDGES: Record<PlanetId, PlanetCartridge> = {
  // 2. MARS (LEVEL 2)
  mars: {
    id: 'mars',
    order: 2,
    sector: 'SECTOR 02',
    name: 'Mars',
    tagline: 'The Red Planet • Outpost Jezero',
    subtitle: 'Cold Desert & Global Dust Storms',
    description:
      'The secondary human proving ground. A dry, oxidized world where thin CO2 atmosphere, high UV radiation, and severe regolith dust storms demand constant life support calibration.',
    dayUnit: { singular: 'SOL', plural: 'SOLS' },
    image: '/planets/mars.png',
    requiredPrevScore: 500,
    unlockTargetScore: 650,
    prevPlanetId: 'earth',
    nextPlanetId: 'venus',
    theme: {
      bgGradient: 'from-amber-950 via-slate-950 to-red-950',
      bgDark: '#0B1026',
      primaryColor: 'text-[#E87040]',
      accentHex: '#E87040',
      borderColor: 'border-[#E87040]/50',
      borderGlow: 'shadow-[0_0_20px_rgba(232,112,64,0.35)]',
      weatherEffect: 'dust',
      cardBg: 'bg-[#141b3d]/90',
      skyHue: 'rgba(180, 83, 9, 0.15)',
    },
    locations: [
      {
        id: 'jezero',
        name: 'Jezero Crater Delta',
        tagline: 'Ancient Riverbed Clay & Lacustrine Deposits',
        description: 'Rich in clays and hydrated silica. Ideal for subsurface water-ice extraction.',
        perksSummary: '+10% Starting Oxygen • -15% Oxygen Depletion',
        bonusStats: { oxygen: 10, power: 0, shielding: 0 },
        pinColor: '#E87040',
        icon: '🌊',
      },
      {
        id: 'olympus',
        name: 'Olympus Mons Caldera',
        tagline: 'High-Altitude Shield Volcano Rim (21.9 km)',
        description: 'Towering above 80% of the Martian dust veil. High solar efficiency but extreme cold.',
        perksSummary: '+15% Solar Power Gain • +10% Starting Shielding',
        bonusStats: { oxygen: 0, power: 15, shielding: 10 },
        pinColor: '#F59E0B',
        icon: '🌋',
      },
      {
        id: 'valles',
        name: 'Valles Marineris Floor',
        tagline: 'Grand Canyon of Mars (7 km Deep)',
        description: 'Deep rift valley with denser atmosphere and natural basalt radiation shielding.',
        perksSummary: '+20% Shielding Retention • +5% Morale',
        bonusStats: { oxygen: 5, power: 5, shielding: 15 },
        pinColor: '#EF4444',
        icon: '🏜️',
      },
    ],
    customMetrics: [
      {
        key: 'shielding',
        name: 'Rad Shielding',
        shortName: 'RADIATION',
        icon: '🛡️',
        min: 0,
        max: 100,
        defaultValue: 80,
        unit: '%',
        dangerLow: 20,
        color: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        description: 'Magnetic deflection against cosmic rays and solar proton events.',
      },
      {
        key: 'dustAccumulation',
        name: 'Regolith Dust Load',
        shortName: 'DUST',
        icon: '🌪️',
        min: 0,
        max: 100,
        defaultValue: 15,
        unit: '%',
        dangerHigh: 75,
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        description: 'Fine electrostatic dust coats solar collectors and air intakes.',
      },
    ],
    actions: [
      {
        id: 'scrubber_surge',
        title: 'Atmospheric Scrubber Surge',
        subtitle: 'Cryogenic CO2 extraction',
        description: 'Overdrive the MOXIE electrolysis cycle to produce breathable oxygen.',
        category: 'survival',
        icon: '🫁',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { oxygen: 20, power: -12, customMetricDelta: { dustAccumulation: 5 } },
        flavorQuote: 'Turning the toxic carbon sky into sweet mountain air.',
      },
      {
        id: 'deploy_scrapers',
        title: 'Electrostatic Panel Scrapers',
        subtitle: 'Clean photovoltaic arrays',
        description: 'Pulse high-voltage ionization across solar panels to shed Martian regolith.',
        category: 'engineering',
        icon: '⚡',
        cooldownSols: 2,
        resourceCosts: { power: 6 },
        guaranteedEffects: { power: 15, customMetricDelta: { dustAccumulation: -35 } },
        flavorQuote: 'A flash of static and the glass clears like new morning.',
      },
      {
        id: 'subsurface_drill',
        title: 'Subsurface Permafrost Drill',
        subtitle: 'Tap ground water ice',
        description: 'Drive diamond-tipped augers into ancient frozen aquifers.',
        category: 'science',
        icon: '⛏️',
        cooldownSols: 3,
        resourceCosts: { power: 14, shielding: 5 },
        guaranteedEffects: { oxygen: 25, morale: 5 },
        flavorQuote: 'Pure water ice locked asleep since the Noachian era.',
      },
      {
        id: 'dust_wall_fortify',
        title: 'Deploy Regolith Sandbag Wall',
        subtitle: 'Passive radiation bunker',
        description: 'Plow compacted iron-rich dirt over habitat modules to bolster radiation absorption.',
        category: 'special',
        icon: '🧱',
        cooldownSols: 2,
        resourceCosts: { power: 10 },
        guaranteedEffects: { shielding: 25, power: -10 },
        flavorQuote: 'A meter of dirt is worth a ton of lead.',
      },
    ],
    planetItems: [
      {
        slug: 'perchlorate-battery',
        name: 'Perchlorate High-Drain Cell',
        icon: '🔋',
        priceCredits: 120,
        description: 'Martian soil chemical battery that dumps +35 Power instantly.',
        tacticalEffect: '+35 Instant Habitat Power',
        category: 'consumable',
      },
      {
        slug: 'rad-shielding-gel',
        name: 'Ablative Polymer Gel',
        icon: '🛡️',
        priceCredits: 150,
        description: 'Dense hydrogenated spray gel that reinforces radiation shielding by +30%.',
        tacticalEffect: '+30% Radiation Shielding',
        category: 'tech',
      },
    ],
    signatureMechanic: {
      name: 'Regolith Dust Storm Accumulation',
      description: 'Dust load increases each sol. Exceeding 75% impairs solar generators and air intakes.',
      hazardAlert: 'MARTIAN DUST DEVIL: High electrostatic buildup detected!',
    },
  },

  // 1. EARTH (LEVEL 1 - BASELINE)
  earth: {
    id: 'earth',
    order: 1,
    sector: 'SECTOR 01',
    name: 'Earth',
    tagline: 'Kessler Cascade & Space Debris Belt',
    subtitle: 'Worst-Case Scenario: Planetary Crisis',
    description:
      'Humankinds cradle and the essential proving ground. Surrounded by a swirling halo of dead satellites, rocket stages, and hypervelocity shrapnel that threatens total orbital lockout.',
    dayUnit: { singular: 'DAY', plural: 'DAYS' },
    image: '/planets/earth.png',
    requiredPrevScore: 0,
    unlockTargetScore: 500,
    nextPlanetId: 'mars',
    theme: {
      bgGradient: 'from-blue-950 via-slate-950 to-emerald-950',
      bgDark: '#030E26',
      primaryColor: 'text-cyan-400',
      accentHex: '#06B6D4',
      borderColor: 'border-cyan-400/50',
      borderGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
      weatherEffect: 'debris',
      cardBg: 'bg-[#091836]/90',
      skyHue: 'rgba(6, 182, 212, 0.15)',
    },
    locations: [
      {
        id: 'iss_zenith',
        name: 'ISS Zenith Orbital Node',
        tagline: 'Historic International Station Hub',
        description: 'Tethered to the historic station backbone. Maximum power bus access and telemetry.',
        perksSummary: '+15% Power Storage • +10% Communications Range',
        bonusStats: { power: 15, oxygen: 5, shielding: 0 },
        pinColor: '#38BDF8',
        icon: '🛰️',
      },
      {
        id: 'equatorial_graveyard',
        name: 'Equatorial Graveyard Orbit',
        tagline: 'Geostationary Transfer Crossing',
        description: 'High-density junk orbit with abundant salvageable micro-electronics.',
        perksSummary: '+20% Salvage Yield • +5% Starting Shielding',
        bonusStats: { power: 10, oxygen: 0, shielding: 5 },
        pinColor: '#10B981',
        icon: '⚙️',
      },
      {
        id: 'polar_vortex_skiff',
        name: 'Polar Reconnaissance Perch',
        tagline: 'Sun-Synchronous Polar Track',
        description: 'Continuous solar illumination along the day-night terminator.',
        perksSummary: '+20% Solar Generation • +10% Shielding',
        bonusStats: { power: 20, oxygen: 0, shielding: 10 },
        pinColor: '#6366F1',
        icon: '🌐',
      },
    ],
    customMetrics: [
      {
        key: 'orbitalDebris',
        name: 'Debris Density',
        shortName: 'DEBRIS',
        icon: '🛰️',
        min: 0,
        max: 100,
        defaultValue: 25,
        unit: '%',
        dangerHigh: 75,
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        description: 'Proximity cloud of high-velocity paint flecks, bolts, and rocket casings.',
      },
      {
        key: 'radarLock',
        name: 'ASAT Radar Tracking',
        shortName: 'RADAR',
        icon: '📡',
        min: 0,
        max: 100,
        defaultValue: 10,
        unit: '%',
        dangerHigh: 80,
        color: 'text-rose-400',
        barColor: 'bg-rose-500',
        description: 'Ground-based anti-satellite tracking arrays locking onto your telemetry.',
      },
    ],
    actions: [
      {
        id: 'ciws_flak',
        title: 'CIWS Tungsten Flak Defense',
        subtitle: 'Intercept incoming debris',
        description: 'Fire a point-defense kinetic burst to vaporize an approaching debris wave.',
        category: 'survival',
        icon: '💥',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { power: -12, customMetricDelta: { orbitalDebris: -30 } },
        flavorQuote: 'Tracer rounds slicing through a storm of dead aluminum.',
      },
      {
        id: 'retro_thruster_burn',
        title: 'Retro-Thruster Altitude Shift',
        subtitle: 'Evade ground tracking radar',
        description: 'Fire hydrazine RCS pods to execute an orbital phase change.',
        category: 'engineering',
        icon: '🚀',
        cooldownSols: 2,
        resourceCosts: { oxygen: 8, power: 6 },
        guaranteedEffects: { customMetricDelta: { radarLock: -35, orbitalDebris: -10 } },
        flavorQuote: 'A three-second burn pushes our apogee out of their target cone.',
      },
      {
        id: 'aerogel_salvage',
        title: 'Deploy Aerogel Salvage Collector',
        subtitle: 'Catch orbital shrapnel',
        description: 'Extend ultra-low density silicate tiles to safely capture high-value satellite scrap.',
        category: 'science',
        icon: '🧲',
        cooldownSols: 2,
        resourceCosts: { shielding: 6 },
        guaranteedEffects: { power: 22, score: 35 },
        flavorQuote: 'Capturing micro-meteors and gold satellite foil without a spark.',
      },
      {
        id: 'ecm_scramble',
        title: 'Pulse ECM Array',
        subtitle: 'Blind ground tracking stations',
        description: 'Transmit broadband microwave noise down through the ionosphere.',
        category: 'special',
        icon: '📶',
        cooldownSols: 3,
        resourceCosts: { power: 15 },
        guaranteedEffects: { customMetricDelta: { radarLock: -45 }, morale: 8 },
        flavorQuote: 'White static fills the control rooms below.',
      },
    ],
    planetItems: [
      {
        slug: 'orbital-decoy',
        name: 'Chaff & Flare Pod',
        icon: '✨',
        priceCredits: 140,
        description: 'Ejects aluminized Mylar decoys, instantly zeroing ASAT Radar Lock.',
        tacticalEffect: 'Resets ASAT Radar Lock to 0%',
        category: 'consumable',
      },
      {
        slug: 'whipple-shield-plate',
        name: 'Kevlar-Whipple Bumper',
        icon: '🛡️',
        priceCredits: 160,
        description: 'Multi-layer standoff armor absorbing high-speed hypervelocity impacts.',
        tacticalEffect: '+40% Impact Shielding',
        category: 'tech',
      },
    ],
    signatureMechanic: {
      name: 'Kessler Shrapnel & ASAT Radar Escalation',
      description: 'Debris density and ground radar tracking escalate every day unless purged by flak or evasive burns.',
      hazardAlert: 'RADAR LOCK DETECTED: Surface missile guidance tracking active!',
    },
  },

  // 3. VENUS (LEVEL 3)
  venus: {
    id: 'venus',
    order: 3,
    sector: 'SECTOR 03',
    name: 'Venus',
    tagline: 'Cloud City Aerostat Station (55 km)',
    subtitle: 'Supercritical Pressure & Sulfuric Haze',
    description:
      'Beneath the yellow clouds lies a 465°C furnace. At 55 km altitude, pressure and temperature are Earth-like, but corrosive sulfuric rain never stops.',
    dayUnit: { singular: 'CYCLE', plural: 'CYCLES' },
    image: '/planets/venus.png',
    requiredPrevScore: 650,
    unlockTargetScore: 800,
    prevPlanetId: 'mars',
    nextPlanetId: 'mercury',
    theme: {
      bgGradient: 'from-amber-950 via-yellow-950 to-slate-950',
      bgDark: '#1c1303',
      primaryColor: 'text-amber-300',
      accentHex: '#FBBF24',
      borderColor: 'border-amber-400/50',
      borderGlow: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]',
      weatherEffect: 'acid',
      cardBg: 'bg-[#291b05]/90',
      skyHue: 'rgba(245, 158, 11, 0.2)',
    },
    locations: [
      {
        id: 'aphrodite_haven',
        name: 'Aphrodite Terra Sky Station',
        tagline: 'High-Altitude Aerostat Cradle',
        description: 'Stable atmospheric buoyancy band above Aphrodites mountainous highlands.',
        perksSummary: '+15% Altitude Stability • +10% Thermal Isolation',
        bonusStats: { oxygen: 10, power: 5, shielding: 0 },
        pinColor: '#F59E0B',
        icon: '☁️',
      },
      {
        id: 'ishtar_vortex',
        name: 'Ishtar Polar Vortex Shelf',
        tagline: 'High-Velocity Jetstream Harness',
        description: 'Ferocious 360 km/h super-rotation winds spin high-output drag turbines.',
        perksSummary: '+25% Wind Power • +5% Starting Shielding',
        bonusStats: { power: 25, oxygen: 0, shielding: 5 },
        pinColor: '#D97706',
        icon: '🌪️',
      },
      {
        id: 'maxwell_dock',
        name: 'Maxwell Montes Sky Harbor',
        tagline: 'Teflon-Coated Anchor Platform',
        description: 'Anchored via carbon-nanotube tethers to the tallest volcanic peak.',
        perksSummary: '+20% Acid Corrosion Resistance',
        bonusStats: { power: 5, oxygen: 5, shielding: 15 },
        pinColor: '#B45309',
        icon: '⚓',
      },
    ],
    customMetrics: [
      {
        key: 'altitude',
        name: 'Envelope Altitude',
        shortName: 'ALTITUDE',
        icon: '🎈',
        min: 10,
        max: 90,
        defaultValue: 55,
        unit: 'km',
        dangerLow: 30,
        dangerHigh: 70,
        color: 'text-cyan-400',
        barColor: 'bg-cyan-500',
        description: 'Target safe band is 30–70 km. Below 30 km crushes hull; above 70 km exposes to solar UV.',
      },
      {
        key: 'acidCorrosion',
        name: 'Sulfuric Acid Load',
        shortName: 'ACID',
        icon: '🧪',
        min: 0,
        max: 100,
        defaultValue: 20,
        unit: '%',
        dangerHigh: 75,
        color: 'text-yellow-400',
        barColor: 'bg-yellow-500',
        description: 'Acid mist eating away at envelope seams and solar cells.',
      },
    ],
    actions: [
      {
        id: 'vent_hydrogen',
        title: 'Vent Envelope Hydrogen',
        subtitle: 'Descend to denser air',
        description: 'Safely vent buoyancy gas to descend away from blistering solar radiation.',
        category: 'survival',
        icon: '⬇️',
        cooldownSols: 1,
        resourceCosts: { power: 5 },
        guaranteedEffects: { customMetricDelta: { altitude: -14 }, power: -5 },
        flavorQuote: 'Hissing gas valves drop the station into thick amber fog.',
      },
      {
        id: 'heat_buoyancy_gas',
        title: 'Thermal Core Burner',
        subtitle: 'Ascend to cooler heights',
        description: 'Ignite electric heaters to expand aerostat gas and climb away from high-pressure depths.',
        category: 'engineering',
        icon: '⬆️',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { customMetricDelta: { altitude: 16 }, power: -12 },
        flavorQuote: 'Hot lift gas expands and the sky turns from brown to brilliant gold.',
      },
      {
        id: 'ammonia_wash',
        title: 'Ammonia Neutralizer Wash',
        subtitle: 'Neutralize envelope acid',
        description: 'Spray alkaline ammonia mist across Teflon outer skins to neutralize sulfuric acid.',
        category: 'science',
        icon: '🚿',
        cooldownSols: 2,
        resourceCosts: { oxygen: 6 },
        guaranteedEffects: { customMetricDelta: { acidCorrosion: -40 }, shielding: 10 },
        flavorQuote: 'White fizzing froth strips the corrosive slime away.',
      },
      {
        id: 'atmospheric_scoop',
        title: 'Super-Rotation Air Scoop',
        subtitle: 'Extract atmospheric gases',
        description: 'Deploy supersonic venturi intakes to compress nitrogen and water vapor from clouds.',
        category: 'special',
        icon: '💨',
        cooldownSols: 2,
        resourceCosts: { power: 10 },
        guaranteedEffects: { oxygen: 22, power: -10 },
        flavorQuote: 'Extracting precious water drops out of pure poison.',
      },
    ],
    planetItems: [
      {
        slug: 'teflon-patch-kit',
        name: 'Sacrificial Teflon Patch',
        icon: '🩹',
        priceCredits: 130,
        description: 'Instantly neutralizes sulfuric acid load on the aerostat envelope (-50% Acid).',
        tacticalEffect: '-50% Sulfuric Acid Corrosion',
        category: 'consumable',
      },
      {
        slug: 'helium-ballast-tank',
        name: 'Emergency Helium Injector',
        icon: '🎈',
        priceCredits: 170,
        description: 'Compressed reserve gas that raises altitude by +25 km instantly.',
        tacticalEffect: '+25 km Emergency Altitude Gain',
        category: 'tech',
      },
    ],
    signatureMechanic: {
      name: 'Aerostat Altitude Drift & Acid Corrosion',
      description: 'Habitat must remain between 30–70 km altitude. Outside this band, crushing pressure or UV damage strikes.',
      hazardAlert: 'ALTITUDE CRITICAL: Atmospheric pressure exceeding structural limits!',
    },
  },

  // 4. MERCURY (LEVEL 4)
  mercury: {
    id: 'mercury',
    order: 4,
    sector: 'SECTOR 04',
    name: 'Mercury',
    tagline: 'The Hermean Twilight Crawler',
    subtitle: 'Thermal Extremes: 430°C Day / -180°C Night',
    description:
      'Airless, heavily cratered, and scorched by the sun. The outpost must ride heavy crawler treads, forever pacing the moving twilight terminator line.',
    dayUnit: { singular: 'SHIFT', plural: 'SHIFTS' },
    image: '/planets/mercury.png',
    requiredPrevScore: 800,
    unlockTargetScore: 950,
    prevPlanetId: 'venus',
    nextPlanetId: 'jupiter',
    theme: {
      bgGradient: 'from-orange-950 via-slate-950 to-stone-950',
      bgDark: '#1a0b02',
      primaryColor: 'text-orange-400',
      accentHex: '#FB923C',
      borderColor: 'border-orange-500/50',
      borderGlow: 'shadow-[0_0_20px_rgba(251,146,60,0.35)]',
      weatherEffect: 'solar_flare',
      cardBg: 'bg-[#261205]/90',
      skyHue: 'rgba(234, 88, 12, 0.2)',
    },
    locations: [
      {
        id: 'caloris_rim',
        name: 'Caloris Basin Rim',
        tagline: 'Ancient Impact Basin Ridge',
        description: 'High volcanic ridges offer unobstructed solar line-of-sight and deep thermal sinks.',
        perksSummary: '+20% Solar Battery Output • +10% Thermal Margin',
        bonusStats: { power: 20, oxygen: 0, shielding: 0 },
        pinColor: '#EA580C',
        icon: '🌋',
      },
      {
        id: 'shackleton_hermes',
        name: 'Permanently Shadowed Crater',
        tagline: 'North Pole Water Ice Deposits',
        description: 'Cold craters never touched by sunlight. Deep ice reserves for life support.',
        perksSummary: '+25% Water/Oxygen Reserves • -10% Power',
        bonusStats: { oxygen: 25, power: -10, shielding: 10 },
        pinColor: '#38BDF8',
        icon: '🧊',
      },
      {
        id: 'terminator_highway',
        name: 'Equatorial Scarps Highway',
        tagline: 'Lobate Scarp Compression Fault',
        description: 'Smooth regolith plains ideal for continuous mobile crawler locomotion.',
        perksSummary: '+15% Crawler Speed • +10% Shielding',
        bonusStats: { power: 10, oxygen: 5, shielding: 10 },
        pinColor: '#F97316',
        icon: '🚜',
      },
    ],
    customMetrics: [
      {
        key: 'coreTemp',
        name: 'Core Temperature',
        shortName: 'CORE TEMP',
        icon: '🌡️',
        min: 0,
        max: 100,
        defaultValue: 50,
        unit: '°C',
        dangerLow: 20,
        dangerHigh: 80,
        color: 'text-rose-400',
        barColor: 'bg-rose-500',
        description: 'Safe range is 35–65°C. Over 80°C melts conduits; under 20°C freezes lubricant and pipes.',
      },
      {
        key: 'crawlerOffset',
        name: 'Terminator Offset',
        shortName: 'TERMINATOR',
        icon: '🚜',
        min: -50,
        max: 50,
        defaultValue: 0,
        unit: 'km',
        dangerLow: -40,
        dangerHigh: 40,
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        description: 'Distance from the safe twilight terminator line. Positive is blister sun; negative is void chill.',
      },
    ],
    actions: [
      {
        id: 'fire_treads',
        title: 'Fire Heavy Crawler Treads',
        subtitle: 'Pace the moving twilight',
        description: 'Drive high-torque planetary bogies to reposition the mobile base back onto the twilight line.',
        category: 'survival',
        icon: '🚜',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { customMetricDelta: { crawlerOffset: -20, coreTemp: -10 }, power: -12 },
        flavorQuote: 'Giant steel tracks crunch over molten regolith into the sweet shadow.',
      },
      {
        id: 'cryo_radiator_purge',
        title: 'Cryo-Radiator Venting',
        subtitle: 'Expel thermal spikes',
        description: 'Circulate liquid nitrogen through shaded wing radiators to dump core heat.',
        category: 'engineering',
        icon: '❄️',
        cooldownSols: 2,
        resourceCosts: { oxygen: 6 },
        guaranteedEffects: { customMetricDelta: { coreTemp: -30 } },
        flavorQuote: 'Superheated steam vents into the vacuum, frosting the camera lenses.',
      },
      {
        id: 'sun_facing_solar',
        title: 'Direct Solar Overcharge',
        subtitle: 'Harness raw solar fury',
        description: 'Pivot solar arrays directly into the unfiltered solar corona for massive energy influx.',
        category: 'special',
        icon: '☀️',
        cooldownSols: 2,
        resourceCosts: {},
        guaranteedEffects: { power: 35, customMetricDelta: { coreTemp: 22 } },
        flavorQuote: 'Energy meters red-line as sunlight ten times brighter than Earth hits the glass.',
      },
      {
        id: 'burrow_tracks',
        title: 'Regolith Trench Burrow',
        subtitle: 'Ditch crawler into trench',
        description: 'Lower chassis into a shadowed trench to insulate against coronal mass ejections.',
        category: 'science',
        icon: '⛏️',
        cooldownSols: 3,
        resourceCosts: { power: 10 },
        guaranteedEffects: { shielding: 25, customMetricDelta: { coreTemp: -15 } },
        flavorQuote: 'Hunker down beneath a shelf of ancient basalt.',
      },
    ],
    planetItems: [
      {
        slug: 'molten-salt-sink',
        name: 'Molten-Salt Heat Sink',
        icon: '🧊',
        priceCredits: 150,
        description: 'Phase-change thermal reservoir that instantly absorbs +40°C dangerous core heat.',
        tacticalEffect: '-40°C Core Heat Reduction',
        category: 'tech',
      },
      {
        slug: 'titanium-track-pin',
        name: 'Titanium Bogie Tread Pin',
        icon: '🔧',
        priceCredits: 125,
        description: 'Reinforced track pins that double crawler repositioning distance for 3 shifts.',
        tacticalEffect: '2x Crawler Reposition Distance for 3 Shifts',
        category: 'consumable',
      },
    ],
    signatureMechanic: {
      name: 'Day/Night Hermean Thermal Swing',
      description: 'Core temperature swings violently depending on distance from the twilight line. Staying centered is vital.',
      hazardAlert: 'THERMAL FLUX: Outpost drifting too close to the scorching solar front!',
    },
  },

  // 5. JUPITER (LEVEL 5)
  jupiter: {
    id: 'jupiter',
    order: 5,
    sector: 'SECTOR 05',
    name: 'Jupiter',
    tagline: 'Great Red Spot & Io Plasma Torus',
    subtitle: 'Radiation Belts & Megavolt Lightning',
    description:
      'The king of planets. A churning colossus surrounded by million-gauss radiation belts and titanic megavolt lightning arcs capable of overloading any capacitor.',
    dayUnit: { singular: 'ROTATION', plural: 'ROTATIONS' },
    image: '/planets/jupiter.png',
    requiredPrevScore: 950,
    unlockTargetScore: 1100,
    prevPlanetId: 'mercury',
    nextPlanetId: 'saturn',
    theme: {
      bgGradient: 'from-purple-950 via-amber-950 to-slate-950',
      bgDark: '#120521',
      primaryColor: 'text-purple-400',
      accentHex: '#C084FC',
      borderColor: 'border-purple-500/50',
      borderGlow: 'shadow-[0_0_20px_rgba(192,132,252,0.35)]',
      weatherEffect: 'lightning',
      cardBg: 'bg-[#1b0833]/90',
      skyHue: 'rgba(147, 51, 234, 0.2)',
    },
    locations: [
      {
        id: 'red_spot_eye',
        name: 'Great Red Spot Eye Wall',
        tagline: 'Perpetual Storm Vortex (400 km/h)',
        description: 'Atmospheric boundary with immense electrical potential and endless kinetic wind power.',
        perksSummary: '+30% Flux Harvest • -10% Shielding',
        bonusStats: { power: 25, oxygen: 0, shielding: -10 },
        pinColor: '#EF4444',
        icon: '👁️',
      },
      {
        id: 'io_plasma_torus',
        name: 'Io Magnetic Flux Tube',
        tagline: 'Million-Ampere Plasma Highway',
        description: 'Electromagnetic conduit connecting Io to Jupiter. Unrivaled raw power generation.',
        perksSummary: '+35% Power Generation • High Radiation Drift',
        bonusStats: { power: 30, oxygen: 0, shielding: 5 },
        pinColor: '#F59E0B',
        icon: '⚡',
      },
      {
        id: 'ganymede_magnetopause',
        name: 'Ganymede Magnetic Sanctuary',
        tagline: 'Natural Magnetic Bubble Shield',
        description: 'Tucked inside Ganymedes rare mini-magnetosphere, shielded from radiation.',
        perksSummary: '+25% Radiation Shielding • +10% Oxygen',
        bonusStats: { shielding: 25, oxygen: 10, power: 0 },
        pinColor: '#38BDF8',
        icon: '🛡️',
      },
    ],
    customMetrics: [
      {
        key: 'fluxCharge',
        name: 'Capacitor Voltage',
        shortName: 'VOLTAGE',
        icon: '⚡',
        min: 0,
        max: 100,
        defaultValue: 25,
        unit: '%',
        dangerHigh: 90,
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        description: 'Accumulated electrical charge from atmospheric arcs. Above 90% triggers explosive arc-flash.',
      },
      {
        key: 'radLoad',
        name: 'Radiation Load',
        shortName: 'RADIATION',
        icon: '☢️',
        min: 0,
        max: 100,
        defaultValue: 30,
        unit: 'rem',
        dangerHigh: 80,
        color: 'text-purple-400',
        barColor: 'bg-purple-500',
        description: 'Relativistic Jovian electrons penetrating the hull.',
      },
    ],
    actions: [
      {
        id: 'harvest_lightning',
        title: 'Harvest Flux Lightning',
        subtitle: 'Snare atmospheric megavolts',
        description: 'Deploy superconductive tether arrays into lightning super-bolts to charge primary power cells.',
        category: 'engineering',
        icon: '⚡',
        cooldownSols: 1,
        resourceCosts: {},
        guaranteedEffects: { power: 35, customMetricDelta: { fluxCharge: 25 } },
        flavorQuote: 'A flash brighter than the sun fills the accumulator banks.',
      },
      {
        id: 'grounding_purge',
        title: 'Arc Grounding Plasma Vent',
        subtitle: 'Discharge static overload',
        description: 'Fire an ionized plasma stream down into the deep atmosphere to drain dangerous voltage.',
        category: 'survival',
        icon: '🔌',
        cooldownSols: 1,
        resourceCosts: { power: 6 },
        guaranteedEffects: { customMetricDelta: { fluxCharge: -45 }, power: -6 },
        flavorQuote: 'A purple beam shoots downward, dissipating millions of excess joules.',
      },
      {
        id: 'lead_shutter_deflection',
        title: 'Deploy Magnetic Deflection Coils',
        subtitle: 'Shield from relativistic electrons',
        description: 'Energize magnetic coils to deflect the Jovian radiation belt.',
        category: 'science',
        icon: '🛡️',
        cooldownSols: 2,
        resourceCosts: { power: 14 },
        guaranteedEffects: { shielding: 20, customMetricDelta: { radLoad: -30 } },
        flavorQuote: 'The Geiger counters ticking finally slows to a gentle murmur.',
      },
      {
        id: 'bussard_intake',
        title: 'Metallic Hydrogen Bussard Scoop',
        subtitle: 'Atmospheric compression',
        description: 'Compress trace atmospheric hydrogen and helium into rocket fuel and water.',
        category: 'special',
        icon: '🧪',
        cooldownSols: 3,
        resourceCosts: { power: 12 },
        guaranteedEffects: { oxygen: 25, power: 15, customMetricDelta: { radLoad: 10 } },
        flavorQuote: 'Harvesting the primordial building blocks of the solar system.',
      },
    ],
    planetItems: [
      {
        slug: 'faraday-cage-cell',
        name: 'Superconducting Faraday Shunt',
        icon: '🧲',
        priceCredits: 160,
        description: 'Automated breaker that prevents capacitor arc-flash damage for 3 rotations.',
        tacticalEffect: 'Immunity to Arc-Flash Damage for 3 Rotations',
        category: 'tech',
      },
      {
        slug: 'heavy-chelate-dose',
        name: 'Radioprotective Chelation Stims',
        icon: '💉',
        priceCredits: 140,
        description: 'Flushes heavy radioactive particles from astronaut crew vitals (+35% Vitals).',
        tacticalEffect: '-40 rem Radiation Load & +20% Vitals',
        category: 'consumable',
      },
    ],
    signatureMechanic: {
      name: 'Megavolt Capacitor Surge & Arc-Flash',
      description: 'Capacitor voltage accumulates steadily. Above 90%, dangerous arc-flash shorts vital systems.',
      hazardAlert: 'VOLTAGE OVERLOAD: Capacitors approaching catastrophic arc-flash point!',
    },
  },

  // 6. SATURN (LEVEL 6)
  saturn: {
    id: 'saturn',
    order: 6,
    sector: 'SECTOR 06',
    name: 'Saturn',
    tagline: 'The C-Ring Ice Skimmer',
    subtitle: 'Ring Particles & Cryogenic Plumes',
    description:
      'The jewel of the solar system. A ring skimmer outpost harvesting billions of tons of pristine water-ice boulders while navigating ring-shear turbulence.',
    dayUnit: { singular: 'ORBIT', plural: 'ORBITS' },
    image: '/planets/saturn.png',
    requiredPrevScore: 1100,
    unlockTargetScore: 1250,
    prevPlanetId: 'jupiter',
    nextPlanetId: 'uranus',
    theme: {
      bgGradient: 'from-amber-950 via-slate-950 to-blue-950',
      bgDark: '#0e1224',
      primaryColor: 'text-amber-300',
      accentHex: '#FCD34D',
      borderColor: 'border-amber-300/50',
      borderGlow: 'shadow-[0_0_20px_rgba(252,211,77,0.35)]',
      weatherEffect: 'rings',
      cardBg: 'bg-[#151c38]/90',
      skyHue: 'rgba(217, 119, 6, 0.15)',
    },
    locations: [
      {
        id: 'cassini_void',
        name: 'Cassini Division Void Harbor',
        tagline: 'Gravitational Gap Clearing',
        description: 'Protected clearing kept empty by Mimas orbital resonance. Minimal ring collisions.',
        perksSummary: '+20% Shielding Retention • +10% Power',
        bonusStats: { shielding: 20, power: 10, oxygen: 0 },
        pinColor: '#F59E0B',
        icon: '🪐',
      },
      {
        id: 'enceladus_plumes',
        name: 'Enceladus Cryo-Plume Field',
        tagline: 'Active Geyser E-Ring Halo',
        description: 'Geysers blasting pure salty water-ice into orbit. Maximum ice harvesting yield.',
        perksSummary: '+30% Starting Ice Cargo • +5% Shielding',
        bonusStats: { oxygen: 15, power: 5, shielding: 5 },
        pinColor: '#38BDF8',
        icon: '⛲',
      },
      {
        id: 'f_ring_shepherd',
        name: 'F-Ring Shepherd Haven',
        tagline: 'Prometheus & Pandora Orbital Corridor',
        description: 'Gravitational braiding keeps dense ice braids clustered for easy capture.',
        perksSummary: '+25% Harpoon Efficiency • +10% Oxygen',
        bonusStats: { power: 15, oxygen: 15, shielding: 0 },
        pinColor: '#EAB308',
        icon: '🛰️',
      },
    ],
    customMetrics: [
      {
        key: 'iceCargo',
        name: 'Mined Ring Ice',
        shortName: 'RING ICE',
        icon: '🧊',
        min: 0,
        max: 100,
        defaultValue: 20,
        unit: 't',
        color: 'text-cyan-300',
        barColor: 'bg-cyan-400',
        description: 'Tons of pristine ammonia water-ice boulders secured in cargo bays.',
      },
      {
        key: 'ringShear',
        name: 'Ring Particle Shear',
        shortName: 'RING SHEAR',
        icon: '💍',
        min: 0,
        max: 100,
        defaultValue: 15,
        unit: '%',
        dangerHigh: 80,
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        description: 'Abrasive micro-ice hail sandblasting hull plating and sensor arrays.',
      },
    ],
    actions: [
      {
        id: 'launch_harpoon',
        title: 'Launch Ring Ice Harpoon',
        subtitle: 'Snare water-ice boulder',
        description: 'Fire a rocket-assisted tether into a 10-meter ring fragment and reel it into the cargo hold.',
        category: 'survival',
        icon: '🎯',
        cooldownSols: 1,
        resourceCosts: { power: 8 },
        guaranteedEffects: { customMetricDelta: { iceCargo: 25 }, power: -8 },
        flavorQuote: 'The winch groans as a house-sized snowball is locked into the gantry.',
      },
      {
        id: 'melt_ice_cargo',
        title: 'Thermal Core Ice Cracker',
        subtitle: 'Convert ice to O2 & Power',
        description: 'Channel reactor heat into cargo bays to crack ring ice into breathing oxygen and propellant.',
        category: 'engineering',
        icon: '♨️',
        cooldownSols: 1,
        resourceCosts: {},
        guaranteedEffects: { oxygen: 25, power: 15, customMetricDelta: { iceCargo: -30 } },
        flavorQuote: 'Clean water vapor rushes into the habitat circulation ducts.',
      },
      {
        id: 'deflector_repulse',
        title: 'Magnetic Particle Deflector',
        subtitle: 'Repel abrasive ring dust',
        description: 'Charge external hull plates to scatter incoming gravel-sized ice chunks.',
        category: 'science',
        icon: '🛡️',
        cooldownSols: 2,
        resourceCosts: { power: 10 },
        guaranteedEffects: { customMetricDelta: { ringShear: -35 }, shielding: 10 },
        flavorQuote: 'A glittering cloud of crystals bounces harmlessly away.',
      },
      {
        id: 'shepherd_slingshot',
        title: 'Shepherd Moon Slingshot',
        subtitle: 'Gravitational boost',
        description: 'Execute a close flyby past Prometheus to harvest gravitational potential energy.',
        category: 'special',
        icon: '🌠',
        cooldownSols: 3,
        resourceCosts: { shielding: 8 },
        guaranteedEffects: { power: 30, score: 40, customMetricDelta: { ringShear: 15 } },
        flavorQuote: 'Riding the gravitational crest like a cosmic surfboard.',
      },
    ],
    planetItems: [
      {
        slug: 'titanium-tether',
        name: 'Diamond-Braided Harpoon Tether',
        icon: '🪢',
        priceCredits: 140,
        description: 'Reinforced line that doubles harvested ice cargo yield (+40t Ice Cargo).',
        tacticalEffect: '+40 Tons Instant Ring Ice Cargo',
        category: 'consumable',
      },
      {
        slug: 'ring-skimmer-hull',
        name: 'Cryogenic Deflector Crystal',
        icon: '💎',
        priceCredits: 175,
        description: 'Amplifies particle deflectors, halving all Ring Shear accumulation for 4 orbits.',
        tacticalEffect: 'Halves Ring Shear for 4 Orbits',
        category: 'tech',
      },
    ],
    signatureMechanic: {
      name: 'Ring Ice Harpooning & Particle Shear',
      description: 'Harpoon ice boulders to convert into Oxygen & Power bursts while keeping Ring Shear under control.',
      hazardAlert: 'RING SHEAR HIGH: Dense boulder field causing hull abrasion!',
    },
  },

  // 7. URANUS (LEVEL 7)
  uranus: {
    id: 'uranus',
    order: 7,
    sector: 'SECTOR 07',
    name: 'Uranus',
    tagline: 'The Tilted Giant & Methane Cryo-Depths',
    subtitle: '98° Axial Tilt • -224°C Cryogenic Deep',
    description:
      'The coldest world in the solar system. A sideways-spinning ice giant shrouded in aquamarine clouds of methane, ammonia, and water slush.',
    dayUnit: { singular: 'WATCH', plural: 'WATCHES' },
    image: '/planets/uranus.png',
    requiredPrevScore: 1250,
    unlockTargetScore: 1400,
    prevPlanetId: 'saturn',
    nextPlanetId: 'neptune',
    theme: {
      bgGradient: 'from-cyan-950 via-slate-950 to-teal-950',
      bgDark: '#041820',
      primaryColor: 'text-cyan-300',
      accentHex: '#67E8F9',
      borderColor: 'border-cyan-300/50',
      borderGlow: 'shadow-[0_0_20px_rgba(103,232,249,0.35)]',
      weatherEffect: 'frost',
      cardBg: 'bg-[#08222c]/90',
      skyHue: 'rgba(6, 182, 212, 0.2)',
    },
    locations: [
      {
        id: 'miranda_cliffs',
        name: 'Verona Rupes Abyss',
        tagline: 'Tallest Cliff in the Solar System (20 km)',
        description: 'Towering cliff shelf with deep geothermal cracks providing precious warmth.',
        perksSummary: '+20% Thermal Protection • +15% Starting Shielding',
        bonusStats: { shielding: 15, power: 10, oxygen: 0 },
        pinColor: '#06B6D4',
        icon: '🏔️',
      },
      {
        id: 'titania_chasm',
        name: 'Titania Subsurface Chasm',
        tagline: 'Deep Frozen Carbonate Faults',
        description: 'Tectonic canyon network sheltered from fierce upper atmospheric jet streams.',
        perksSummary: '+25% Hydraulic Fluid Stability • +10% Oxygen',
        bonusStats: { oxygen: 15, power: 5, shielding: 10 },
        pinColor: '#0891B2',
        icon: '🕳️',
      },
      {
        id: 'polar_skiff',
        name: '98-Degree Tilted Polar Skiff',
        tagline: 'Sun-Facing Pole Outpost',
        description: 'Pointed directly at the distant sun during its 42-year long polar summer.',
        perksSummary: '+20% Continuous Solar Alignment',
        bonusStats: { power: 20, oxygen: 5, shielding: 0 },
        pinColor: '#22D3EE',
        icon: '❄️',
      },
    ],
    customMetrics: [
      {
        key: 'hydraulics',
        name: 'Hydraulic Fluid Pressure',
        shortName: 'HYDRAULICS',
        icon: '🔧',
        min: 0,
        max: 100,
        defaultValue: 65,
        unit: '%',
        dangerLow: 30,
        color: 'text-cyan-400',
        barColor: 'bg-cyan-500',
        description: 'Pressure of anti-freeze fluid. Below 30% freezes action controls each watch until thawed.',
      },
      {
        key: 'methaneMix',
        name: 'Methane Density',
        shortName: 'METHANE',
        icon: '🧪',
        min: 0,
        max: 100,
        defaultValue: 20,
        unit: '%',
        dangerHigh: 75,
        color: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        description: 'Atmospheric methane enrichment level. Volatile at high concentrations.',
      },
    ],
    actions: [
      {
        id: 'thaw_hydraulics',
        title: 'Thermal De-Icer Core Pulse',
        subtitle: 'Thaw frozen actuators',
        description: 'Channel high-current heating elements through hydraulic conduits to melt slush.',
        category: 'survival',
        icon: '🔥',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { customMetricDelta: { hydraulics: 35 }, power: -12 },
        flavorQuote: 'Heated glycol flows again with a sharp metal clunk.',
      },
      {
        id: 'compress_methane',
        title: 'Compress Atmospheric Methane',
        subtitle: 'Extract fuel from clouds',
        description: 'Intake and compress ambient methane gas for rocket thrust and thermal generation.',
        category: 'engineering',
        icon: '⛽',
        cooldownSols: 2,
        resourceCosts: { power: 8 },
        guaranteedEffects: { power: 25, customMetricDelta: { methaneMix: 20 } },
        flavorQuote: 'Liquid blue methane fuels the station auxiliary generators.',
      },
      {
        id: 'vent_methane_flare',
        title: 'Methane Flare Burn-Off',
        subtitle: 'Prevent explosion risk',
        description: 'Vent and ignite excess volatile methane away from habitat modules.',
        category: 'science',
        icon: '🕯️',
        cooldownSols: 2,
        resourceCosts: {},
        guaranteedEffects: { customMetricDelta: { methaneMix: -40 }, shielding: 10 },
        flavorQuote: 'A bright blue flame illuminates the aquamarine mist.',
      },
      {
        id: 'ice_slush_melt',
        title: 'Cryo-Slush Melter',
        subtitle: 'Extract water from slush mantle',
        description: 'Scoop slush from the deep mantle and filter it into clean drinking water and oxygen.',
        category: 'special',
        icon: '💧',
        cooldownSols: 2,
        resourceCosts: { power: 10 },
        guaranteedEffects: { oxygen: 25, customMetricDelta: { hydraulics: -10 } },
        flavorQuote: 'Melting ice that has remained frozen for four billion years.',
      },
    ],
    planetItems: [
      {
        slug: 'glycol-de-icer',
        name: 'Glycol Rapid De-Icer Canister',
        icon: '🧪',
        priceCredits: 135,
        description: 'Instantly thaws frozen control actuators and restores Hydraulics to 100%.',
        tacticalEffect: 'Restores Hydraulics to 100% & Thaws Controls',
        category: 'consumable',
      },
      {
        slug: 'methane-catalytic-heater',
        name: 'Catalytic Methane Heater',
        icon: '🔥',
        priceCredits: 165,
        description: 'Provides continuous thermal heating (+15 Power/Watch) for 3 watches.',
        tacticalEffect: '+15 Power per Watch for 3 Watches',
        category: 'tech',
      },
    ],
    signatureMechanic: {
      name: 'Cryogenic Hydraulic Freeze',
      description: 'Freezing temperatures drain hydraulic pressure. Dropping below 30% freezes action controls.',
      hazardAlert: 'FREEZE WARNING: Cryogenic hydraulics locking control actuators!',
    },
  },

  // 8. NEPTUNE (LEVEL 8)
  neptune: {
    id: 'neptune',
    order: 8,
    sector: 'SECTOR 08',
    name: 'Neptune',
    tagline: 'The Great Dark Spot & Diamond Rain Sky',
    subtitle: '2,100 km/h Supersonic Winds • Diamond Hail',
    description:
      'The farthest recognized planet. Raging with supersonic methane jet streams and crushing pressures that condense carbon into diamond hail showers.',
    dayUnit: { singular: 'TIDE', plural: 'TIDES' },
    image: '/planets/neptune.png',
    requiredPrevScore: 1400,
    unlockTargetScore: 1550,
    prevPlanetId: 'uranus',
    nextPlanetId: 'planet_x',
    theme: {
      bgGradient: 'from-blue-950 via-indigo-950 to-slate-950',
      bgDark: '#080d26',
      primaryColor: 'text-indigo-400',
      accentHex: '#818CF8',
      borderColor: 'border-indigo-400/50',
      borderGlow: 'shadow-[0_0_20px_rgba(129,140,248,0.35)]',
      weatherEffect: 'supersonic',
      cardBg: 'bg-[#0f173d]/90',
      skyHue: 'rgba(59, 130, 246, 0.2)',
    },
    locations: [
      {
        id: 'dark_spot_core',
        name: 'Great Dark Spot Eye',
        tagline: 'Supersonic Storm Vortex Core',
        description: 'A raging storm the size of Earth with immense kinetic wind energy.',
        perksSummary: '+30% Wind Turbine Power • -15% Shielding',
        bonusStats: { power: 30, oxygen: 0, shielding: -15 },
        pinColor: '#3B82F6',
        icon: '🌀',
      },
      {
        id: 'triton_tether',
        name: 'Triton Orbit Station',
        tagline: 'Retrograde Cryovolcanic Moon Harbor',
        description: 'Nitrogen ice geysers and stable gravitational anchor point.',
        perksSummary: '+20% Nitrogen Life Support • +10% Shielding',
        bonusStats: { oxygen: 20, shielding: 10, power: 0 },
        pinColor: '#60A5FA',
        icon: '🌕',
      },
      {
        id: 'scooter_jetstream',
        name: 'White Scooter Cloud Ridge',
        tagline: 'Rapid Atmospheric Cirrus Wave',
        description: 'Cirrus clouds of methane ice racing around the planet every 16 hours.',
        perksSummary: '+20% Speed Bonus • +15% Diamond Yield',
        bonusStats: { power: 15, oxygen: 10, shielding: 5 },
        pinColor: '#93C5FD',
        icon: '💨',
      },
    ],
    customMetrics: [
      {
        key: 'windShear',
        name: 'Supersonic Wind Shear',
        shortName: 'WIND SHEAR',
        icon: '🌪️',
        min: 0,
        max: 100,
        defaultValue: 35,
        unit: 'm/s',
        dangerHigh: 85,
        color: 'text-cyan-400',
        barColor: 'bg-cyan-500',
        description: 'Violent 2,100 km/h wind shear. Above 85% threatens anchor line snap.',
      },
      {
        key: 'diamondHail',
        name: 'Diamond Hail Stash',
        shortName: 'DIAMONDS',
        icon: '💎',
        min: 0,
        max: 100,
        defaultValue: 0,
        unit: 'ct',
        color: 'text-indigo-300',
        barColor: 'bg-indigo-400',
        description: 'Extracted solid carbon crystals harvested from the lower mantle rain.',
      },
    ],
    actions: [
      {
        id: 'deploy_drogue',
        title: 'Deploy Supersonic Drogue Chute',
        subtitle: 'Stabilize in raging winds',
        description: 'Extend carbon-weave drag drogues to damp violent turbulence and stabilize station heading.',
        category: 'survival',
        icon: '🪂',
        cooldownSols: 1,
        resourceCosts: { power: 8 },
        guaranteedEffects: { customMetricDelta: { windShear: -35 }, power: -8 },
        flavorQuote: 'The drogue pops and shuddering turbulence calms to a smooth hum.',
      },
      {
        id: 'harvest_diamond_hail',
        title: 'Extend Diamond Collection Scoop',
        subtitle: 'Catch falling carbon crystals',
        description: 'Lower tungsten collection hoppers into the crushing depths to scoop pure crystallized diamond hail.',
        category: 'engineering',
        icon: '💎',
        cooldownSols: 1,
        resourceCosts: { power: 12, shielding: 6 },
        guaranteedEffects: { customMetricDelta: { diamondHail: 30, windShear: 15 } },
        flavorQuote: 'A glittering shower of million-carat diamonds hits the hopper with a metallic ring.',
      },
      {
        id: 'refine_carbon_gems',
        title: 'Refine Diamond Hail to GC & Plating',
        subtitle: 'Fortify hull & sell gems',
        description: 'Compress collected diamonds into reinforced armor plating and catalog gems for colony credits.',
        category: 'science',
        icon: '🛡️',
        cooldownSols: 2,
        resourceCosts: {},
        guaranteedEffects: { shielding: 25, score: 50, customMetricDelta: { diamondHail: -25 } },
        flavorQuote: 'Diamond armor renders the habitat hull virtually impervious.',
      },
      {
        id: 'wind_generator_burst',
        title: 'Supersonic Ram-Air Turbine',
        subtitle: 'Convert storm to power',
        description: 'Deploy variable-pitch ram-air turbines into the 2,100 km/h jetstream.',
        category: 'special',
        icon: '⚡',
        cooldownSols: 2,
        resourceCosts: {},
        guaranteedEffects: { power: 35, customMetricDelta: { windShear: 20 } },
        flavorQuote: 'The turbines scream like jet engines, flooding the battery cells.',
      },
    ],
    planetItems: [
      {
        slug: 'drogue-anchor',
        name: 'Titanium-Kevlar Drogue Anchor',
        icon: '🪂',
        priceCredits: 150,
        description: 'Stabilizes wind shear at safe levels for 3 consecutive tides.',
        tacticalEffect: 'Wind Shear Capped at Safe Levels for 3 Tides',
        category: 'tech',
      },
      {
        slug: 'diamond-cutter-tool',
        name: 'Carbon Crystallizer Scoop',
        icon: '💎',
        priceCredits: 160,
        description: 'Doubles all Diamond Hail yield when harvested (+40 ct Diamond Hail).',
        tacticalEffect: '+40 ct Diamond Hail Bonus Stash',
        category: 'consumable',
      },
    ],
    signatureMechanic: {
      name: 'Supersonic Wind Shear & Diamond Rain',
      description: 'Extreme jet streams threaten station stability. Harvesting diamond hail rewards massive shielding and score.',
      hazardAlert: 'SUPERSONIC JETSTREAM: Wind shear approaching structural threshold!',
    },
  },

  // 9. PLANET X (LEVEL X - SECRET)
  planet_x: {
    id: 'planet_x',
    order: 'X',
    sector: 'SECTOR X',
    name: 'Planet X',
    tagline: 'Trans-Neptunian Micro-Singularity',
    subtitle: 'Cosmic Anomaly • Spacetime Distortion',
    description:
      'A mythical primordial black hole or rogue dark-matter world lurking 600 AU out in the frozen Kuiper cliff. Spacetime bends, and quantum decoherence scrambles reality.',
    dayUnit: { singular: 'EPOCH', plural: 'EPOCHS' },
    image: '/planets/planet_x.png',
    secret: true,
    requiredPrevScore: 1550,
    unlockTargetScore: 1700,
    prevPlanetId: 'neptune',
    theme: {
      bgGradient: 'from-purple-950 via-black to-slate-950',
      bgDark: '#030108',
      primaryColor: 'text-fuchsia-400',
      accentHex: '#E879F9',
      borderColor: 'border-fuchsia-500/60',
      borderGlow: 'shadow-[0_0_30px_rgba(232,121,249,0.5)]',
      weatherEffect: 'glitch',
      cardBg: 'bg-[#10031f]/90',
      skyHue: 'rgba(168, 85, 247, 0.25)',
    },
    locations: [
      {
        id: 'sedna_aphelion',
        name: 'Sedna Far-Point Abyss',
        tagline: 'Deep Oort Cloud Aphelion (937 AU)',
        description: 'Deepest point of human exploration. Absolute stillness before the void.',
        perksSummary: '+20% Quantum Resonance • +15% Starting Power',
        bonusStats: { power: 20, oxygen: 10, shielding: 0 },
        pinColor: '#D946EF',
        icon: '🌌',
      },
      {
        id: 'singularity_horizon',
        name: 'Micro-Black Hole Ergosphere',
        tagline: 'Primordial Singularity Boundary',
        description: 'Orbiting the event horizon of an ancient micro-black hole for boundless gravitational energy.',
        perksSummary: '+40% Raw Power Draw • High Entropy Drift',
        bonusStats: { power: 40, shielding: -10, oxygen: 0 },
        pinColor: '#A855F7',
        icon: '🕳️',
      },
      {
        id: 'oort_anchor_node',
        name: 'Oort Genesis Array',
        tagline: 'Pristine Cometary Cluster',
        description: 'Anchored to a billion-ton primordial comet rich in volatile organics and water.',
        perksSummary: '+25% Oxygen Retention • +15% Shielding',
        bonusStats: { oxygen: 25, shielding: 15, power: 0 },
        pinColor: '#818CF8',
        icon: '☄️',
      },
    ],
    customMetrics: [
      {
        key: 'entropy',
        name: 'Quantum Decoherence',
        shortName: 'ENTROPY',
        icon: '🌀',
        min: 0,
        max: 100,
        defaultValue: 20,
        unit: '%',
        dangerHigh: 70,
        color: 'text-fuchsia-400',
        barColor: 'bg-fuchsia-500',
        description: 'Spacetime stability index. Exceeding 70% scrambles HUD readings and reality matrices.',
      },
      {
        key: 'anchorCharge',
        name: 'Graviton Anchor Integrity',
        shortName: 'GRAVITON',
        icon: '⚓',
        min: 0,
        max: 100,
        defaultValue: 80,
        unit: '%',
        dangerLow: 30,
        color: 'text-indigo-400',
        barColor: 'bg-indigo-500',
        description: 'Tether stability holding the outpost anchored near the anomaly.',
      },
    ],
    actions: [
      {
        id: 'pulse_quantum_anchor',
        title: 'Pulse Graviton Quantum Anchor',
        subtitle: 'Collapse decoherence waves',
        description: 'Emit a coherent graviton burst to collapse rogue probability waves and re-anchor local reality.',
        category: 'survival',
        icon: '⚓',
        cooldownSols: 1,
        resourceCosts: { power: 12 },
        guaranteedEffects: { customMetricDelta: { entropy: -40, anchorCharge: 30 }, power: -12 },
        flavorQuote: 'Reality clicks back into sharp focus like a lens snapping into alignment.',
      },
      {
        id: 'hawking_radiation_siphon',
        title: 'Hawking Radiation Siphon',
        subtitle: 'Harvest black hole flux',
        description: 'Siphon pure quantum energy emitting from the micro-black hole event horizon.',
        category: 'engineering',
        icon: '⚡',
        cooldownSols: 1,
        resourceCosts: {},
        guaranteedEffects: { power: 45, customMetricDelta: { entropy: 25 } },
        flavorQuote: 'Drawing limitless power from the very edge of nothingness.',
      },
      {
        id: 'stasis_barrier_lock',
        title: 'Chrono-Stasis Reality Barrier',
        subtitle: 'Lock local causality field',
        description: 'Encase habitat modules in a static causality field to protect crew vitals from temporal slips.',
        category: 'science',
        icon: '🛡️',
        cooldownSols: 2,
        resourceCosts: { power: 15 },
        guaranteedEffects: { shielding: 30, oxygen: 15, customMetricDelta: { anchorCharge: -15 } },
        flavorQuote: 'Inside the bubble, seconds freeze while stars spin outside.',
      },
      {
        id: 'chrono_rewind',
        title: 'Tachyonic Temporal Rewind',
        subtitle: 'Reverse previous epoch attrition',
        description: 'Channel tachyons to invert local timeline and recover lost oxygen and power.',
        category: 'special',
        icon: '⏳',
        cooldownSols: 3,
        resourceCosts: {},
        guaranteedEffects: { power: 25, oxygen: 25, customMetricDelta: { entropy: 20 } },
        flavorQuote: 'Yesterday returns, unbroken and renewed.',
      },
    ],
    planetItems: [
      {
        slug: 'tachyonic-stabilizer',
        name: 'Tachyonic Reality Anchor',
        icon: '🌀',
        priceCredits: 200,
        description: 'Freezes Quantum Decoherence at 0% for 3 consecutive epochs.',
        tacticalEffect: 'Freezes Entropy at 0% for 3 Epochs',
        category: 'tech',
      },
      {
        slug: 'singularity-cell',
        name: 'Micro-Singularity Energy Core',
        icon: '🕳️',
        priceCredits: 250,
        description: 'Provides immense unlimited power (+50 Power) without increasing entropy.',
        tacticalEffect: '+50 Instant Clean Power',
        category: 'consumable',
      },
    ],
    signatureMechanic: {
      name: 'Quantum Decoherence & Chrono-Slips',
      description: 'Quantum Entropy accumulates. Above 70%, HUD telemetry glitches and metric deltas scramble.',
      hazardAlert: 'REALITY DECOHERENCE: Spacetime anomaly disrupting ship telemetry!',
    },
  },
};

export const ORDERED_PLANET_IDS: PlanetId[] = [
  'earth',
  'mars',
  'venus',
  'mercury',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'planet_x',
];

/** Get cartridge definition by Planet ID with Earth fallback */
export function getPlanetCartridge(planetId?: PlanetId | string): PlanetCartridge {
  if (planetId && planetId in PLANET_CARTRIDGES) {
    return PLANET_CARTRIDGES[planetId as PlanetId];
  }
  return PLANET_CARTRIDGES.earth;
}

/** Retrieve localized day unit (singular/plural) for a planet with Earth/Mars fallback */
export function getPlanetDayUnit(planetId?: PlanetId | string): PlanetDayUnit {
  const cartridge = getPlanetCartridge(planetId);
  return cartridge.dayUnit || { singular: 'SOL', plural: 'SOLS' };
}

/** Retrieve all saved best scores from localStorage */
export function getPlanetBestScores(): Record<PlanetId, number> {
  if (typeof window === 'undefined') return {} as Record<PlanetId, number>;
  try {
    const raw = localStorage.getItem('jat_planet_best_scores_v1');
    if (!raw) return {} as Record<PlanetId, number>;
    return JSON.parse(raw) as Record<PlanetId, number>;
  } catch {
    return {} as Record<PlanetId, number>;
  }
}

/** Check if Planet X Easter egg has been unlocked via 5 clicks */
export function isEasterEggUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('jat_planet_x_easter_egg_v1') === 'true';
  } catch {
    return false;
  }
}

/** Unlock Planet X via the stealth Easter egg */
export function unlockPlanetXEasterEgg(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('jat_planet_x_easter_egg_v1', 'true');
    window.dispatchEvent(new Event('jat-planet-unlocked'));
  } catch {}
}

/** Check if Planet X is unlocked (legacy & compatibility) */
export function unlockPlanetX(): void {
  unlockPlanetXEasterEgg();
}

/**
 * DEVTEST26 QA God-Mode Override: Unlocks all 9 planets, sets 5000+ scores, and enables Planet X
 */
export function unlockAllPlanetsGodMode(): void {
  if (typeof window === 'undefined') return;
  try {
    const godScores: Record<PlanetId, number> = {
      earth: 5000,
      mars: 5000,
      venus: 5000,
      mercury: 5000,
      jupiter: 5000,
      saturn: 5000,
      uranus: 5000,
      neptune: 5000,
      planet_x: 5000,
    };
    localStorage.setItem('jat_planet_best_scores_v1', JSON.stringify(godScores));
    localStorage.setItem('jat_planet_x_easter_egg_v1', 'true');
    window.dispatchEvent(new Event('jat-planet-score-updated'));
    window.dispatchEvent(new Event('jat-planet-unlocked'));
  } catch {}
}

/**
 * Check if a planet is unlocked based on VIP Five-Star General status,
 * score requirements on the previous planet, or Easter egg.
 */
export function isPlanetUnlocked(
  planetId: PlanetId,
  isFiveStarGeneral = false,
  bestScores?: Partial<Record<PlanetId, number>>
): boolean {
  // 1. VIP Five-Star Generals have all 9 sectors unconditionally unlocked
  if (isFiveStarGeneral) return true;

  // 2. Earth is the default starting sector
  if (planetId === 'earth') return true;

  const scores = bestScores || getPlanetBestScores();

  // 3. Planet X requires >= 1,550 on Neptune OR the stealth Easter egg
  if (planetId === 'planet_x') {
    if (isEasterEggUnlocked()) return true;
    return (scores.neptune || 0) >= 1550;
  }

  // 4. Other planets require reaching unlockTargetScore on the preceding world
  const cartridge = PLANET_CARTRIDGES[planetId];
  if (!cartridge || !cartridge.prevPlanetId) return true;

  const prevScore = scores[cartridge.prevPlanetId] || 0;
  return prevScore >= cartridge.requiredPrevScore;
}

/**
 * Save a newly achieved Standard Mode score and check if it unlocks the next planet.
 */
export function savePlanetBestScore(
  planetId: PlanetId,
  score: number
): { isNewBest: boolean; unlockedPlanet?: PlanetId } {
  if (typeof window === 'undefined') return { isNewBest: false };
  try {
    const scores = getPlanetBestScores();
    const currentBest = scores[planetId] || 0;
    const isNewBest = score > currentBest;

    if (isNewBest) {
      scores[planetId] = score;
      localStorage.setItem('jat_planet_best_scores_v1', JSON.stringify(scores));
      window.dispatchEvent(new Event('jat-planet-score-updated'));
    }

    // Check if score crossed unlockTargetScore for the next sector
    const cartridge = PLANET_CARTRIDGES[planetId];
    let unlockedPlanet: PlanetId | undefined = undefined;

    if (
      cartridge.nextPlanetId &&
      currentBest < cartridge.unlockTargetScore &&
      score >= cartridge.unlockTargetScore
    ) {
      unlockedPlanet = cartridge.nextPlanetId;
      window.dispatchEvent(new Event('jat-planet-unlocked'));
    }

    return { isNewBest, unlockedPlanet };
  } catch {
    return { isNewBest: false };
  }
}

/**
 * Get the highest unlocked sector metadata for the cadet
 */
export function getHighestUnlockedSector(
  isFiveStarGeneral = false,
  bestScores?: Record<PlanetId, number>
): PlanetCartridge {
  if (isFiveStarGeneral) {
    return PLANET_CARTRIDGES.planet_x;
  }
  const scores = bestScores || getPlanetBestScores();
  return PLANET_CARTRIDGES.earth;
}

/**
 * Rollback all planet unlocks, best scores, and Easter eggs to base Earth-only progression.
 * Used during cadet profile reset / purge.
 */
export function resetPlanetProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('jat_planet_best_scores_v1');
    localStorage.removeItem('jat_planet_x_easter_egg_v1');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('jat_planet_') || key.startsWith('jat_campaign_'))) {
        localStorage.removeItem(key);
      }
    }
    window.dispatchEvent(new Event('jat-planet-score-updated'));
    window.dispatchEvent(new Event('jat-planet-unlocked'));
  } catch {}
}

export interface PlanetMissionGuide {
  id: PlanetId;
  name: string;
  icon: string;
  gameType:
    | 'card-survival'
    | 'radar-triangulation'
    | 'aerostat-flight'
    | 'laser-turret'
    | 'gravity-slingshot'
    | 'asteroid-dodge'
    | 'diamond-harvester'
    | 'jetstream-runner'
    | 'boss-battle';
  objective: string;
  winCondition: string;
  lossCondition: string;
  controls: string[];
  scoringTip: string;
}

export const PLANET_MISSION_GUIDES: Record<PlanetId, PlanetMissionGuide> = {
  earth: {
    id: 'earth',
    name: 'Earth: Impact Triangulation',
    icon: '🌍',
    gameType: 'radar-triangulation',
    objective: 'Triangulate and pinpoint all incoming space debris & meteor impact points across the orbital radar grid.',
    winCondition: 'Locate 3 impact targets within 8 radar scans or before time expires.',
    lossCondition: 'Exhaust all 8 radar scans without finding the targets, or radar timer reaches zero.',
    controls: ['Click/tap grid coordinates to ping radar pulse', 'Read distance rings to triangulate target epicenters'],
    scoringTip: 'Fewer scans used and faster pinpointing yield maximum accuracy multipliers.',
  },
  mars: {
    id: 'mars',
    name: 'Mars: Outpost Jezero Survival',
    icon: '🪐',
    gameType: 'card-survival',
    objective: 'Manage life support, energy, and habitat shielding across 30 grueling Martian Sols.',
    winCondition: 'Survive through Sol 30 with all vitals (Power, O2, Shielding) above zero.',
    lossCondition: 'Power, Oxygen, or Shielding depleted to 0%.',
    controls: ['Click or tap decision cards each Sol', 'Use exclusive planetary tactical abilities', 'Equip colony store modules'],
    scoringTip: 'Maintain high morale, low dust accumulation, and balanced resources for high bonus multipliers.',
  },
  venus: {
    id: 'venus',
    name: 'Venus: Aerostat Wave-Rider',
    icon: '☁️',
    gameType: 'aerostat-flight',
    objective: 'Pilot a NASA HAVOC cloud platform inside the temperate 50-60 km atmospheric corridor.',
    winCondition: 'Survive the full 45-second flight through sulfuric acid cloud layers.',
    lossCondition: 'Hull integrity drops to 0% from acid clouds or drifting out of safe atmospheric altitude.',
    controls: ['Hold Space / Click / Touch to fire buoyancy heaters (Ascend)', 'Release to vent ballast (Descend)'],
    scoringTip: 'Collect golden solar wind telemetry orbs and stay centered in the green corridor for continuous score flow.',
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury: Solar Flare Turret Defense',
    icon: '☄️',
    gameType: 'laser-turret',
    objective: 'Defend the crawling outpost from incoming meteors and high-energy solar radiation clusters.',
    winCondition: 'Survive 3 waves (45 seconds total) and eliminate 15+ meteor hazards.',
    lossCondition: 'Outpost defense shield drops to 0% from unintercepted meteor strikes.',
    controls: ['Aim with Mouse / Touch', 'Click / Tap to fire laser turret', 'Spacebar / Button for EMP Shockwave'],
    scoringTip: 'Chain explosive meteor destructions without missing to build up a 3x combo multiplier.',
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter: Gravity-Slingshot Rodeo',
    icon: '🛰️',
    gameType: 'gravity-slingshot',
    objective: "Time your orbital burn inside Jupiter's colossal gravity well to slingshot through target telemetry gates.",
    winCondition: 'Successfully complete 4 slingshot telemetry gates without crashing.',
    lossCondition: "Exhaust probe burn fuel, get swallowed by Jupiter's core, or fly off into deep space.",
    controls: ['Click / Space / Tap to ignite retro & prograde thruster burns', 'Guide probe along gravitational orbital arcs'],
    scoringTip: 'Threading close to the atmospheric radiation belt grants huge risk-reward proximity points.',
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn: Cassini Ring Threader',
    icon: '🪐',
    gameType: 'asteroid-dodge',
    objective: 'Thread through the hazardous Cassini Division ring plane, dodging high-density ice boulders.',
    winCondition: 'Survive 40 seconds of high-speed ring particle navigation.',
    lossCondition: 'Shield integrity reaches 0% from ice boulder collisions.',
    controls: ['Left/Right Arrow keys, A/D, or Drag/Touch left & right to maneuver lateral thrusters'],
    scoringTip: 'Grapple ice water chunks with precision to restore shields and score salvage points.',
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus: Cryo-Diamond Harvester',
    icon: '💎',
    gameType: 'diamond-harvester',
    objective: 'Deploy cryogenic magnetic harvesters to catch falling high-pressure diamond hail while dodging slush chunks.',
    winCondition: 'Collect 12+ crystalline diamonds within 45 seconds.',
    lossCondition: 'Harvester hull crushed by heavy cryo-methane slush blocks or failing quota.',
    controls: ['Move Harvester Basket Left/Right via Arrow Keys, A/D, or Mouse / Touch Drag'],
    scoringTip: 'Catching rare glowing cyan diamonds awards instant 2x multipliers.',
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune: Supersonic Jetstream Runner',
    icon: '🌪️',
    gameType: 'jetstream-runner',
    objective: 'Surf 2,100 km/h supersonic methane jet streams, shifting lanes to avoid violent atmospheric cyclonic vortices.',
    winCondition: 'Survive the 45-second storm run and reach the Great Dark Spot core.',
    lossCondition: 'Ship structural integrity buckles to 0% from cyclonic vortex impacts.',
    controls: ['Up/Down or Left/Right Arrow keys, W/S, or Lane Buttons / Swipes to shift jetstream lanes'],
    scoringTip: 'Ride the slipstream acceleration vectors to build supersonic burst speeds and rack up speed points.',
  },
  planet_x: {
    id: 'planet_x',
    name: 'Planet X: Singularity Anomaly Boss',
    icon: '🕳️',
    gameType: 'boss-battle',
    objective: 'Neutralize the spacetime decoherence anomaly of the primordial micro-singularity.',
    winCondition: "Deplete the Singularity Anomaly's 1,000 HP across 3 phase shifts.",
    lossCondition: 'Ship Quantum Hull integrity collapses to 0% under gravitational tidal strikes.',
    controls: ['Turn-based tactical commands: Quantum Cannon, Phase Shift Shield, Graviton Surge, Chrono Rewind'],
    scoringTip: 'Time Phase Shift Shield during charge-up turns to absorb 90% damage and counter-charge your cannon.',
  },
};
