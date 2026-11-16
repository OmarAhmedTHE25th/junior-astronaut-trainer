// ─── Junior Astronaut Mission Trainer – Planet-Specific Event Generation ───
// Pure functions. No React, no DOM.
// Authentically models planetary hazards and space weather across all 9 Solar System expedition worlds.

import type { GameState, GameEvent, EventChoice } from './types';
import type { PlanetId } from './planetCartridges';
import { EVENT_CHANCE, DIFFICULTY_SETTINGS, CRITICAL_THRESHOLD } from './constants';
import { getEndlessEventChance } from './survivalEngine';

// ── NASA Data Imports ───────────────────────────────────────
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  donkiEvents = require('../data/donki-events.json');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  spaceBiology = require('../data/space-biology.json');
} catch {
  // Fall back to built-in catalog if data files not yet generated.
}

// ── Helpers ─────────────────────────────────────────────────
let currentRng: () => number = Math.random;

function random(): number {
  return currentRng();
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════
// 1. EARTH SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildEarthKesslerEvent(): GameEvent {
  const severity: 1 | 2 | 3 = random() < 0.35 ? 3 : random() < 0.7 ? 2 : 1;
  const shieldDmg = -(severity * 7);
  return {
    id: `kessler-debris-${Date.now()}`,
    title: '🛰️ Kessler Debris Cascade Alert!',
    description:
      severity === 3
        ? 'Catastrophic orbital fragmentation! Defunct upper-stage collision creates thousands of hypervelocity shrapnel fragments crossing your station\'s orbital plane at 28,000 km/h!'
        : 'Space Surveillance radar tracks a dense cloud of spent rocket casing debris bearing down on your orbital laboratory.',
    severity,
    choices: [
      {
        id: 'cold-gas-evasion',
        text: 'Fire cold-gas reaction thrusters to execute an avoidance burn.',
        effects: { power: -(severity * 6), oxygen: -2, shielding: 5 },
        moraleEffect: 2,
        scoreEffect: 25,
        outcome: 'The orbital evasion burn shifted your orbit by 800 meters. The debris cloud whizzed past harmlessly!',
        scienceFact:
          'NASA\'s Orbital Debris Program Office tracks over 27,000 pieces of space junk larger than 10 cm in Low Earth Orbit.',
      },
      {
        id: 'reinforce-whipple',
        text: 'Deploy automated debris harpoon and reinforce Whipple shield bumpers.',
        effects: { power: -4, oxygen: -3, shielding: shieldDmg },
        moraleEffect: -4,
        outcome: 'Hypervelocity paint flecks and aluminum fragments peppered the outer Whipple bumper, absorbing the blast.',
        scienceFact:
          'Whipple shields use spaced layers of aluminum and Nextel ceramic fabric that vaporize incoming orbital projectiles on impact.',
      },
    ],
    nasaSource: 'https://orbitaldebris.jsc.nasa.gov/',
    icon: '🛰️',
  };
}

function buildEarthGeomagneticEvent(): GameEvent {
  const severity: 1 | 2 | 3 = random() < 0.4 ? 3 : 2;
  const pwrLoss = -(severity * 8);
  return {
    id: `earth-geomagnetic-${Date.now()}`,
    title: '⚡ Severe G5 Geomagnetic Storm!',
    description:
      'A direct-hit coronal mass ejection impacts Earth\'s magnetosphere, inducing massive electrical currents across the station\'s metallic trusses and solar arrays!',
    severity,
    choices: [
      {
        id: 'ground-avionics',
        text: 'Isolate avionics buses and engage active magnetic deflector.',
        effects: { power: pwrLoss, oxygen: 0, shielding: 12 },
        moraleEffect: 1,
        scoreEffect: 30,
        outcome: 'Magnetic shielding deflected induced surface voltages, though battery reserves took an intense drain.',
        scienceFact:
          'The 1859 Carrington Event caused telegraph wires worldwide to spark and ignite; modern satellites face electrostatic surface charging.',
      },
      {
        id: 'absorb-induction',
        text: 'Reroute induced voltage spikes into primary battery storage banks.',
        effects: { power: Math.floor(pwrLoss / 2), oxygen: -4, shielding: -8 },
        moraleEffect: -3,
        outcome: 'Power was harvested, but electrical arcing damaged sensitive outer sensor arrays and shield circuits.',
        scienceFact:
          'NOAA Space Weather Prediction Center rates geomagnetic storms from G1 (minor) to G5 (extreme) using ground magnetometer arrays.',
      },
    ],
    nasaSource: 'https://www.swpc.noaa.gov/',
    icon: '⚡',
  };
}

function buildEarthAsatEvent(): GameEvent {
  return {
    id: `asat-lock-${Date.now()}`,
    title: '🎯 ASAT Fire-Control Radar Lock!',
    description:
      'Ground-based missile tracking telemetry locks onto your outpost during an unannounced anti-satellite radar sweep!',
    severity: 2,
    choices: [
      {
        id: 'deploy-chaff',
        text: 'Deploy radar chaff cloud and telemetry decoy frequency shift.',
        effects: { power: -6, oxygen: -2, shielding: 6 },
        moraleEffect: 4,
        scoreEffect: 40,
        outcome: 'The chaff bloom broke the radar lock instantly! Mission Control verified clear airspace.',
        scienceFact:
          'In November 2021, a direct-ascent ASAT missile test created over 1,500 pieces of trackable debris in LEO, threatening the ISS.',
      },
      {
        id: 'emergency-plane-change',
        text: 'Execute emergency delta-V burn into alternate orbital inclination.',
        effects: { power: -14, oxygen: 0, shielding: 0 },
        moraleEffect: 1,
        outcome: 'You safely relocated your orbital trajectory, burning significant maneuvering propellant.',
        scienceFact:
          'Spacecraft perform Pre-Determined Debris Avoidance Maneuvers (PDAM) whenever miss distances are under 1 kilometer.',
      },
    ],
    nasaSource: 'https://www.nasa.gov/mission_pages/station/news/orbital_debris.html',
    icon: '🎯',
  };
}

function buildEarthOrbitalDecayEvent(): GameEvent {
  return {
    id: `orbital-decay-${Date.now()}`,
    title: '📉 Thermospheric Orbital Decay Drag!',
    description:
      'Solar UV flare radiation has expanded Earth\'s upper atmosphere, multiplying atmospheric drag and pulling your station toward premature re-entry!',
    severity: 2,
    choices: [
      {
        id: 'progress-reboost',
        text: 'Perform an automated orbital altitude re-boost burn.',
        effects: { power: -12, oxygen: -3, shielding: 4 },
        moraleEffect: 3,
        scoreEffect: 20,
        outcome: 'Main thrusters fired for 8 minutes, boosting your orbit by 3.2 kilometers back into safe vacuum.',
        scienceFact:
          'The ISS loses roughly 100 meters of altitude every day due to atmospheric drag and requires regular cargo-craft re-boost burns.',
      },
      {
        id: 'feather-arrays',
        text: 'Feather solar arrays parallel to velocity vector to minimize drag.',
        effects: { power: -18, oxygen: 0, shielding: -2 },
        moraleEffect: -2,
        outcome: 'Feathering reduced drag significantly, but solar power generation dropped sharply while arrays were edge-on.',
        scienceFact:
          'During night-side orbital passes, ISS solar wings are commanded into "Night Glider" mode edge-on to the velocity vector to reduce drag.',
      },
    ],
    nasaSource: 'https://www.nasa.gov/international-space-station/',
    icon: '📉',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 2. VENUS SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildVenusAcidShearEvent(): GameEvent {
  const severity: 1 | 2 | 3 = random() < 0.4 ? 3 : 2;
  return {
    id: `acid-shear-${Date.now()}`,
    title: '☁️ Sulfuric Acid Cloud Shear!',
    description:
      'Hurricane-force winds buffet your aerostat habitat with a dense bank of concentrated sulfuric acid (H₂SO₄) mist droplets!',
    severity,
    choices: [
      {
        id: 'teflon-coat',
        text: 'Engage electrostatic Teflon fluoropolymer coating wash.',
        effects: { power: -(severity * 6), oxygen: 0, shielding: 10 },
        moraleEffect: 2,
        scoreEffect: 30,
        outcome: 'Fluoropolymer repelled the corrosive droplets! The outer aerostat envelope sustained zero degradation.',
        scienceFact:
          'Venus\'s cloud layers are 75% to 96% concentrated sulfuric acid, yet hover at an altitude with Earth-like room temperature (25°C).',
      },
      {
        id: 'descend-nitrogen',
        text: 'Vent ballast gas to dip into the denser nitrogen-buffered cloud deck.',
        effects: { power: -4, oxygen: -6, shielding: -(severity * 6) },
        moraleEffect: -4,
        outcome: 'Dropping altitude mitigated wind shear, but the higher ambient heat taxed environmental life support.',
        scienceFact:
          'NASA\'s HAVOC concept envisions permanent crewed zeppelins floating 50 km above Venus, where solar power is 1.4x higher than on Earth.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/venus/',
    icon: '☁️',
  };
}

function buildVenusSuperRotationEvent(): GameEvent {
  return {
    id: `super-rotation-${Date.now()}`,
    title: '🌪️ Super-Rotation 400 km/h Wind Vortex!',
    description:
      'The upper atmosphere of Venus rotates 60 times faster than the solid planet below, generating extreme 400 km/h wind shear against your outpost!',
    severity: 2,
    choices: [
      {
        id: 'surf-jetstream',
        text: 'Trim aerostat stabilizer fins to surf the jetstream wave.',
        effects: { power: -5, oxygen: -3, shielding: -4 },
        moraleEffect: 4,
        scoreEffect: 45,
        outcome: 'Masterful aeronautics! You harnessed the super-rotating winds to generate passive turbine energy.',
        scienceFact:
          'Venus takes 243 Earth days to rotate once, but its high-altitude winds circle the entire globe in only 4 days!',
      },
      {
        id: 'tether-counter-ballast',
        text: 'Deploy a weighted counter-ballast tether into lower, slower strata.',
        effects: { power: -11, oxygen: -2, shielding: 6 },
        moraleEffect: 0,
        outcome: 'The deep ballast tether stabilized the habitat, keeping orientation steady despite the violent wind shear.',
        scienceFact:
          'Wind speeds decrease from 360 km/h at cloud-top levels to almost zero (walking speed) at the scorched surface.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/venus/in-depth/',
    icon: '🌪️',
  };
}

function buildVenusBarometricSpikeEvent(): GameEvent {
  return {
    id: `barometric-spike-${Date.now()}`,
    title: '💥 Crushing Barometric Pressure Plume!',
    description:
      'A dense downdraft drags your floating station toward lower altitudes where ambient pressure spikes toward 92 atmospheres!',
    severity: 3,
    choices: [
      {
        id: 'emergency-buoyancy-heat',
        text: 'Fire thermal emergency buoyancy heaters at maximum output!',
        effects: { power: -16, oxygen: 0, shielding: 8 },
        moraleEffect: 3,
        scoreEffect: 35,
        outcome: 'Thermal buoyancy expanded the lifting envelope, climbing swiftly back to the safe 55-kilometer Goldilocks zone.',
        scienceFact:
          'Surface pressure on Venus is 92 bars (equal to being 900 meters underwater on Earth)—strong enough to crush Soviet Venera probes in under 2 hours.',
      },
      {
        id: 'reinforce-bulkheads',
        text: 'Seal internal titanium pressure bulkheads and equalize nitrogen mixture.',
        effects: { power: -6, oxygen: -10, shielding: -12 },
        moraleEffect: -6,
        outcome: 'Bulkheads groaned under the immense barometric load. Habitat integrity held, but structural shielding is strained.',
        scienceFact:
          'Human-breathable air (21% O₂, 78% N₂) is a natural lifting gas in Venus\'s heavy CO₂ atmosphere, providing 60% of helium\'s lift!',
      },
    ],
    nasaSource: 'https://solarsystem.nasa.gov/planets/venus/in-depth/',
    icon: '💥',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 3. MERCURY SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildMercuryMagneticReconnectionEvent(): GameEvent {
  return {
    id: `magnetic-reconnection-${Date.now()}`,
    title: '🧲 Solar Wind Magnetic Reconnection!',
    description:
      'The Sun\'s interplanetary magnetic field snaps and reconnects with Mercury\'s miniature magnetic field, opening a giant plasma funnel directly to the surface!',
    severity: 3,
    choices: [
      {
        id: 'faraday-isolation',
        text: 'Deploy deep Faraday isolation grounding rods into bedrock.',
        effects: { power: -12, oxygen: -2, shielding: 10 },
        moraleEffect: 2,
        scoreEffect: 35,
        outcome: 'Faraday grounding safely discharged millions of volts of solar plasma straight into the regolith.',
        scienceFact:
          'NASA\'s MESSENGER spacecraft discovered Mercury experiences "flux transfer events"—magnetic tornadoes that channel solar plasma straight to the rocks.',
      },
      {
        id: 'subterranean-shelter',
        text: 'Order crew into a permanently shadowed lava-tube bunker.',
        effects: { power: -4, oxygen: -7, shielding: -10 },
        moraleEffect: -4,
        outcome: 'The crew sheltered safely, but surface sensors and communications masts sustained severe plasma arcing damage.',
        scienceFact:
          'Mercury has a magnetic field only 1% as strong as Earth\'s, but its proximity to the Sun makes magnetic reconnection events 10x more violent.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/mission/messenger/',
    icon: '🧲',
  };
}

function buildMercuryTerminatorThermalShockEvent(): GameEvent {
  return {
    id: `terminator-shock-${Date.now()}`,
    title: '🔥 600°C Terminator Thermal Shock!',
    description:
      'Crossing Mercury\'s day/night terminator boundary induces a brutal 600°C temperature swing (-180°C to +430°C), triggering violent thermal expansion across station struts!',
    severity: 2,
    choices: [
      {
        id: 'liquid-sodium-heat-pipe',
        text: 'Circulate liquid sodium heat pipes to equalize structural trusses.',
        effects: { power: -10, oxygen: -2, shielding: 8 },
        moraleEffect: 3,
        scoreEffect: 25,
        outcome: 'Active heat distribution balanced the thermal gradient, preventing metallurgical fatigue fractures.',
        scienceFact:
          'Mercury experiences the most extreme temperature swings in the solar system: 430°C on the sunlit side down to -180°C on the nightside.',
      },
      {
        id: 'ceramic-blankets',
        text: 'Deploy reflective ceramic multilayer insulation blankets.',
        effects: { power: -4, oxygen: -5, shielding: -8 },
        moraleEffect: -2,
        outcome: 'Thermal blankets softened the shock, but expansion groans rattled the habitat throughout the passage.',
        scienceFact:
          'ESA\'s BepiColombo spacecraft uses specialized white ceramic coatings to reflect intense solar irradiance 10 times stronger than at Earth.',
      },
    ],
    nasaSource: 'https://www.esa.int/Science_Exploration/Space_Science/BepiColombo',
    icon: '🔥',
  };
}

function buildMercuryMicrometeoriteEvent(): GameEvent {
  return {
    id: `mercury-micrometeorite-${Date.now()}`,
    title: '☄️ Sungrazing Micrometeorite Swarm!',
    description:
      'Debris from a disintegrated sungrazing comet pelts the airless surface of Mercury at extreme velocities exceeding 70 km/s!',
    severity: 2,
    choices: [
      {
        id: 'retract-arrays',
        text: 'Retract solar collectors into subterranean shadow trenches.',
        effects: { power: -15, oxygen: 0, shielding: 12 },
        moraleEffect: 1,
        scoreEffect: 25,
        outcome: 'Trench retraction shielded your solar cells from hypervelocity pitting.',
        scienceFact:
          'With virtually no atmosphere to burn up debris, Mercury is continuously sandblasted by interplanetary dust, creating a tenuous mineral exosphere.',
      },
      {
        id: 'basalt-blast-berm',
        text: 'Erect an electromagnetic regolith defense berm.',
        effects: { power: -6, oxygen: -5, shielding: -6 },
        moraleEffect: -2,
        outcome: 'The regolith berm absorbed most kinetic hits, leaving micro-craters across the defensive perimeter.',
        scienceFact:
          'Water ice deposits in permanently shadowed polar craters on Mercury are preserved beneath a layer of dark cometary organic dust.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/mercury/',
    icon: '☄️',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 4. JUPITER SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildJupiterIoPlasmaTorusEvent(): GameEvent {
  return {
    id: `io-plasma-torus-${Date.now()}`,
    title: '🟣 Io Plasma Torus Radiation Surge!',
    description:
      'Volcanic sulfur dioxide from moon Io ionizes into a lethal multi-million volt radiation doughnut enveloping your Jovian orbital corridor!',
    severity: 3,
    choices: [
      {
        id: 'lead-water-vault',
        text: 'Direct auxiliary water shielding into the habitat radiation vault.',
        effects: { power: -10, oxygen: -4, shielding: 14 },
        moraleEffect: 2,
        scoreEffect: 40,
        outcome: 'The water-shielded vault attenuated the lethal proton flux. Crew radiation badges stayed in the green!',
        scienceFact:
          'Moon Io spews 1 ton of volcanic gases per second into Jupiter\'s magnetosphere, generating a massive electric current of 5 million amperes.',
      },
      {
        id: 'superconducting-coil',
        text: 'Energize the superconducting electromagnetic deflection ring.',
        effects: { power: -18, oxygen: 0, shielding: 6 },
        moraleEffect: 0,
        outcome: 'The magnetic coil repelled ionized sulfur particles, but drawn current emptied primary storage capacitors.',
        scienceFact:
          'NASA\'s Juno spacecraft carries a 1-centimeter-thick titanium radiation vault to shield its computers from Jupiter\'s deadly radiation belts.',
      },
    ],
    nasaSource: 'https://www.nasa.gov/mission_pages/juno/main/index.html',
    icon: '🟣',
  };
}

function buildJupiterGreatRedSpotEvent(): GameEvent {
  return {
    id: `great-red-spot-${Date.now()}`,
    title: '🔴 Great Red Spot Cyclonic Shear!',
    description:
      'Proximity to Jupiter\'s Great Red Spot exposes your station to 430 km/h perimeter gale winds and atmospheric acoustic shockwaves!',
    severity: 2,
    choices: [
      {
        id: 'ride-downdraft',
        text: 'Surf the peripheral anticyclonic downdraft to harvest momentum.',
        effects: { power: -6, oxygen: -2, shielding: -5 },
        moraleEffect: 5,
        scoreEffect: 50,
        outcome: 'Incredible navigation! You rode the perimeter vortex, translating atmospheric turbulence into kinetic energy.',
        scienceFact:
          'The Great Red Spot is an anticyclone storm wider than Earth that has raged for at least 350 years, reaching over 300 miles deep.',
      },
      {
        id: 'gimbaled-thrusters',
        text: 'Fire gimbaled stabilization thrusters against the shear.',
        effects: { power: -15, oxygen: -3, shielding: 8 },
        moraleEffect: 1,
        outcome: 'Stabilization thrusters held station attitude firmly outside the vortex boundary.',
        scienceFact:
          'Juno data revealed that winds inside the Great Red Spot extend deep beneath the clouds and drive immense acoustic heating into the upper atmosphere.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/jupiter/',
    icon: '🔴',
  };
}

function buildJupiterMagnetosphericEddyEvent(): GameEvent {
  return {
    id: `metallic-hydrogen-eddy-${Date.now()}`,
    title: '⚡ Metallic Hydrogen Dynamo Surge!',
    description:
      'Deep inside Jupiter, millions of atmospheres of pressure turn hydrogen into liquid metal, generating sudden chaotic electromagnetic induction spikes!',
    severity: 2,
    choices: [
      {
        id: 'optical-isolation',
        text: 'Reroute all primary command telemetry through fiber-optic isolation.',
        effects: { power: -10, oxygen: 0, shielding: 10 },
        moraleEffect: 3,
        scoreEffect: 25,
        outcome: 'Optical isolation channels were completely immune to the magnetic surge. Systems remained online.',
        scienceFact:
          'Jupiter\'s magnetic field is 20,000 times stronger than Earth\'s and creates auroral displays larger than our entire planet.',
      },
      {
        id: 'bleed-voltage',
        text: 'Bleed induced voltage into emergency auxiliary grounding coils.',
        effects: { power: -14, oxygen: -2, shielding: -4 },
        moraleEffect: -2,
        outcome: 'The surge was dissipated safely, though secondary relays showed minor thermal stress.',
        scienceFact:
          'Liquid metallic hydrogen behaves like a superconductor, churning in convection cells that power Jupiter\'s immense magnetosphere.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/jupiter/facts/',
    icon: '⚡',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 5. SATURN SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildSaturnCryovolcanicPlumeEvent(): GameEvent {
  return {
    id: `enceladus-plume-${Date.now()}`,
    title: '❄️ Enceladus Cryovolcanic Plume Icing!',
    description:
      'Supersonic water-ice geysers erupting from moon Enceladus coat your radiator panels and optical sensors in frozen crystalline frost!',
    severity: 2,
    choices: [
      {
        id: 'de-icing-heating',
        text: 'Ignite electrothermal radiator de-icing coils.',
        effects: { power: -11, oxygen: 4, shielding: 6 },
        moraleEffect: 3,
        scoreEffect: 30,
        outcome: 'The thermal coils vaporized the ice crust! Moisture reclamation harvested +4% pure water-derived oxygen.',
        scienceFact:
          'Enceladus harbors a global subsurface liquid ocean that vents water-ice plumes through "tiger stripe" fractures into Saturn\'s E-ring.',
      },
      {
        id: 'orient-heat-shield',
        text: 'Orient main heat shield into the plume spray.',
        effects: { power: -5, oxygen: -4, shielding: -6 },
        moraleEffect: -2,
        outcome: 'The shield deflected the bulk of the crystal blast, keeping optical lenses functional.',
        scienceFact:
          'NASA\'s Cassini spacecraft flew directly through Enceladus\'s plumes, detecting salts, organic compounds, and hydrogen gas.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/mission/cassini/',
    icon: '❄️',
  };
}

function buildSaturnRingPlaneImpactEvent(): GameEvent {
  return {
    id: `ring-plane-impact-${Date.now()}`,
    title: '💍 Ring-Plane Ice Micro-Impact!',
    description:
      'Crossing the outer edge of Saturn\'s F-ring exposes habitat hull to thousands of orbital-velocity water-ice particles!',
    severity: 2,
    choices: [
      {
        id: 'orient-edge-on',
        text: 'Orient habitat edge-on to the ring plane to minimize cross-section.',
        effects: { power: -7, oxygen: -2, shielding: 8 },
        moraleEffect: 2,
        scoreEffect: 35,
        outcome: 'Edge-on orientation reduced collision cross-section by 90%! Station glided through cleanly.',
        scienceFact:
          'Saturn\'s ring system spans up to 282,000 kilometers across, yet is remarkably razor-thin—only about 10 meters thick!',
      },
      {
        id: 'deploy-whipple-mesh',
        text: 'Deploy deployable ice-deflection Whipple bumper mesh.',
        effects: { power: -12, oxygen: 0, shielding: -6 },
        moraleEffect: -2,
        outcome: 'The Whipple mesh pulverized incoming ice chunks into harmless vapor mist.',
        scienceFact:
          'Ring particles are composed of 99% pure water ice, ranging from microscopic dust grains to house-sized boulders.',
      },
    ],
    nasaSource: 'https://solarsystem.nasa.gov/planets/saturn/in-depth/',
    icon: '💍',
  };
}

function buildSaturnHexagonalVortexEvent(): GameEvent {
  return {
    id: `hexagonal-vortex-${Date.now()}`,
    title: '⬡ North Polar Hexagonal Wave Vortex!',
    description:
      'Passing over Saturn\'s north pole entrains your outpost in a massive six-sided standing jetstream wave 30,000 km across!',
    severity: 2,
    choices: [
      {
        id: 'harmonize-oscillation',
        text: 'Harmonize thruster oscillation with the 6-lobed wave harmonics.',
        effects: { power: -8, oxygen: -2, shielding: 4 },
        moraleEffect: 4,
        scoreEffect: 40,
        outcome: 'Fluid dynamics triumph! You harmonized with the hexagonal wave, stabilizing station attitude with minimal fuel.',
        scienceFact:
          'Saturn\'s north pole features a permanent six-sided jetstream wave wide enough to fit more than two Earths inside!',
      },
      {
        id: 'climb-altitude',
        text: 'Burn maneuvering propellant to climb above the vortex boundary.',
        effects: { power: -14, oxygen: -3, shielding: 6 },
        moraleEffect: 0,
        outcome: 'Ascending into higher stratospheric layers successfully escaped the atmospheric turbulence.',
        scienceFact:
          'First photographed by Voyager in 1981 and confirmed by Cassini, the hexagonal storm changes color across Saturnian seasons.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/saturn/',
    icon: '⬡',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 6. URANUS SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildUranusAxialTiltSquallEvent(): GameEvent {
  return {
    id: `uranus-axial-squall-${Date.now()}`,
    title: '🌪️ 98° Axial Tilt Seasonal Convulsion!',
    description:
      'Uranus\'s extreme 98° sideways tilt exposes your habitat to violent seasonal atmospheric squalls after decades of continuous sunlight!',
    severity: 2,
    choices: [
      {
        id: 'cryo-heat-sink',
        text: 'Rebalance cryogenic thermal sinks across the planetary nightside.',
        effects: { power: -9, oxygen: -2, shielding: 8 },
        moraleEffect: 3,
        scoreEffect: 30,
        outcome: 'Thermal sinks redistributed the asymmetric heating, smoothing internal habitat climate.',
        scienceFact:
          'Uranus rotates almost completely on its side with an axial tilt of 97.8°, likely caused by a massive protoplanetary collision billions of years ago.',
      },
      {
        id: 'gyroscopic-stabilizers',
        text: 'Deploy high-torque momentum reaction wheels against the squall.',
        effects: { power: -13, oxygen: 0, shielding: -4 },
        moraleEffect: -2,
        outcome: 'Momentum wheels counteracted the atmospheric torque, keeping sensors locked on target.',
        scienceFact:
          'Because of its sideways rotation, each pole on Uranus gets 42 years of continuous sunlight followed by 42 years of complete darkness.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/uranus/',
    icon: '🌪️',
  };
}

function buildUranusDiamondRainEvent(): GameEvent {
  return {
    id: `uranus-diamond-rain-${Date.now()}`,
    title: '💎 Diamond-Rain Pressure Anomaly!',
    description:
      'Atmospheric pressure anomalies pyrolyze mantle methane into a shower of solid diamond hail striking the bottom habitat hull!',
    severity: 2,
    choices: [
      {
        id: 'diamond-collector',
        text: 'Deploy reinforced carbon harvesting scoop to collect diamond hail.',
        effects: { power: -7, oxygen: -2, shielding: 4 },
        moraleEffect: 6,
        scoreEffect: 65,
        outcome: 'Incredible harvest! Collected crystalline diamond hail will yield immense structural and trade value.',
        scienceFact:
          'Laboratory experiments at SLAC proved that interior pressures inside Uranus and Neptune crush methane into genuine solid diamond crystals.',
      },
      {
        id: 'hardened-tungsten-shield',
        text: 'Angle reinforced tungsten bottom heat shield into the hail.',
        effects: { power: -5, oxygen: -4, shielding: -8 },
        moraleEffect: -2,
        outcome: 'The tungsten shield absorbed the diamond impacts, sustaining superficial acoustic pitting.',
        scienceFact:
          'Diamond hail sinking toward the core is theorized to generate internal heat that drives Uranus\'s deeper mantle convection.',
      },
    ],
    nasaSource: 'https://www.slac.stanford.edu/news/',
    icon: '💎',
  };
}

function buildUranusTumblingMagnetosphereEvent(): GameEvent {
  return {
    id: `uranus-magnetosphere-flip-${Date.now()}`,
    title: '🔄 59° Off-Center Tumbling Magnetosphere!',
    description:
      'Uranus\'s magnetic axis is tilted 59° from its rotational axis and offset by 8,000 km from the center, tumbling like a lopsided top!',
    severity: 2,
    choices: [
      {
        id: 'synchronize-shield-fields',
        text: 'Synchronize active magnetic shields with the corkscrew field.',
        effects: { power: -11, oxygen: 0, shielding: 10 },
        moraleEffect: 2,
        scoreEffect: 30,
        outcome: 'Active shield synchronization harmonized with the corkscrew magnetic tail, eliminating induction surges.',
        scienceFact:
          'Voyager 2 discovered Uranus\'s magnetosphere is tilted 59° and offset by one-third of the planet\'s radius, creating an open-door tumbling magnetic field.',
      },
      {
        id: 'switch-inertial',
        text: 'Switch navigation avionics to autonomous optical star trackers.',
        effects: { power: -4, oxygen: -4, shielding: -7 },
        moraleEffect: -3,
        outcome: 'Optical tracking prevented magnetic compass disorientation while the corkscrew field tumbled past.',
        scienceFact:
          'Uranus\'s magnetic field opens and closes every planetary rotation (17.24 hours), letting solar wind particles pour in when open.',
      },
    ],
    nasaSource: 'https://solarsystem.nasa.gov/planets/uranus/in-depth/',
    icon: '🔄',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 7. NEPTUNE SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildNeptuneSupersonicJetstreamEvent(): GameEvent {
  return {
    id: `neptune-supersonic-wind-${Date.now()}`,
    title: '💨 Supersonic Methane Jetstream (2,100 km/h)!',
    description:
      'The fastest planetary winds in the solar system—screaming at 2,100 km/h—buffet your atmospheric habitat with supersonic turbulence!',
    severity: 3,
    choices: [
      {
        id: 'feather-aerodynamic-foils',
        text: 'Feather aerodynamic drift foils to glide with the jetstream.',
        effects: { power: -9, oxygen: -3, shielding: 8 },
        moraleEffect: 3,
        scoreEffect: 40,
        outcome: 'Aerodynamic foils sliced through the supersonic boundary layer, stabilizing the station safely.',
        scienceFact:
          'Neptune boasts the fastest winds in the solar system, exceeding 1,300 mph (2,100 km/h)—faster than the speed of sound on Earth!',
      },
      {
        id: 'retrograde-counterflow',
        text: 'Anchor drift stabilizers into a retrograde counter-flow cloud layer.',
        effects: { power: -15, oxygen: -4, shielding: -6 },
        moraleEffect: -2,
        outcome: 'The counter-flow anchor held position, though aerodynamic drag taxed maneuvering propulsion.',
        scienceFact:
          'Despite receiving only 1/900th of Earth\'s sunlight, Neptune\'s deep internal heat dynamo drives unprecedented supersonic atmospheric jetstreams.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/neptune/',
    icon: '💨',
  };
}

function buildNeptuneTritonTidalShearEvent(): GameEvent {
  return {
    id: `neptune-triton-shear-${Date.now()}`,
    title: '🌑 Triton Retrograde Tidal Gravitational Shear!',
    description:
      'The gravitational tidal pull of backward-orbiting moon Triton creates micro-gravitational orbital shear and cryogenic geyser ejecta!',
    severity: 2,
    choices: [
      {
        id: 'orbital-resonance-trim',
        text: 'Perform a resonant orbital phase trim maneuver.',
        effects: { power: -12, oxygen: -2, shielding: 8 },
        moraleEffect: 3,
        scoreEffect: 30,
        outcome: 'Orbital phase trim counteracted Triton\'s tidal torque, maintaining clean trajectory.',
        scienceFact:
          'Triton is the only large moon in the solar system that orbits in the direction opposite to its planet\'s rotation (retrograde).',
      },
      {
        id: 'gravity-dampeners',
        text: 'Harden cryogenic nitrogen scrubbers and structural dampeners.',
        effects: { power: -6, oxygen: -7, shielding: -8 },
        moraleEffect: -3,
        outcome: 'Structural dampeners absorbed tidal flexing, though nitrogen filtration systems required an emergency cycle.',
        scienceFact:
          'Triton\'s decaying retrograde orbit means that in 3.6 billion years it will pass inside Neptune\'s Roche limit and break apart into a ring.',
      },
    ],
    nasaSource: 'https://solarsystem.nasa.gov/moons/neptune-moons/triton/in-depth/',
    icon: '🌑',
  };
}

function buildNeptuneDarkSpotSurgeEvent(): GameEvent {
  return {
    id: `neptune-dark-spot-${Date.now()}`,
    title: '🌀 Great Dark Spot Anticyclone Eruption!',
    description:
      'A deep anticyclonic vortex erupts in Neptune\'s southern hemisphere, flanked by bright white methane cirrus companion clouds ("Scooter")!',
    severity: 2,
    choices: [
      {
        id: 'methane-harvest',
        text: 'Deploy atmospheric scoop to harvest high-pressure methane gas.',
        effects: { power: 12, oxygen: -5, shielding: -6 },
        moraleEffect: 4,
        scoreEffect: 45,
        outcome: 'Methane harvest replenished fuel reserves (+12% Power), though atmospheric buffeting strained shields.',
        scienceFact:
          'Unlike Jupiter\'s Great Red Spot, Neptune\'s dark storms appear and vanish every few years, observed by Voyager 2, Hubble, and JWST.',
      },
      {
        id: 'evasive-climb',
        text: 'Execute a throttled ascent away from the vortex shear boundary.',
        effects: { power: -14, oxygen: 0, shielding: 8 },
        moraleEffect: 1,
        outcome: 'Clean ascent avoided the core turbulence, maintaining steady atmospheric pressure.',
        scienceFact:
          'The companion clouds called "Scooter" race across Neptune\'s clouds faster than the dark spot itself, completing a lap every 16 hours.',
      },
    ],
    nasaSource: 'https://hubblesite.org/contents/news-releases/2020/news-2020-59',
    icon: '🌀',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 8. PLANET X SIGNATURE HAZARD EVENTS (REAL ASTRONOMICAL SCIENCE)
// ══════════════════════════════════════════════════════════════════════

function buildPlanetXSednoidPerturbationEvent(): GameEvent {
  return {
    id: `planetx-sednoid-${Date.now()}`,
    title: '🪐 Sednoid Gravitational Resonance Perturbation!',
    description:
      'The gravitational signature of extreme detached trans-Neptunian objects (Sedna and 2012 VP113) perturbs your station\'s deep-space orbit at 600 AU!',
    severity: 2,
    choices: [
      {
        id: 'gravity-gradient-ride',
        text: 'Calculate Batygin-Brown orbital resonance to ride the gravity gradient.',
        effects: { power: -8, oxygen: -2, shielding: 8 },
        moraleEffect: 5,
        scoreEffect: 60,
        outcome: 'Orbital mechanics victory! You harmonized with the clustered eTNO resonance, preserving valuable maneuvering delta-V.',
        scienceFact:
          'Konstantin Batygin & Mike Brown demonstrated that six extreme TNOs share physically clustered orbits with less than 0.001% probability of coincidence.',
      },
      {
        id: 'rcs-burn-counter',
        text: 'Fire hydrazine RCS thrusters to counteract the gravitational tug.',
        effects: { power: -16, oxygen: -2, shielding: 0 },
        moraleEffect: 1,
        outcome: 'Counter-burn held station trajectory stable, though propellant tanks registered significant depletion.',
        scienceFact:
          'Planet Nine is hypothesized to have 5 to 10 Earth masses and orbit in an eccentric path between 400 and 800 AU from the Sun.',
      },
    ],
    nasaSource: 'https://iopscience.iop.org/article/10.3847/0004-6256/151/2/22',
    icon: '🪐',
  };
}

function buildPlanetXOortShowerEvent(): GameEvent {
  return {
    id: `planetx-oort-shower-${Date.now()}`,
    title: '☄️ Inner Oort Cloud Planetesimal Shower!',
    description:
      'Gravitational perturbations shake loose primordial icy cometary bodies from the inner Oort cloud (Hills cloud), drifting into your orbital path!',
    severity: 3,
    choices: [
      {
        id: 'laser-ablation',
        text: 'Deploy high-power laser ablation array to vaporize cometary debris.',
        effects: { power: -15, oxygen: -2, shielding: 12 },
        moraleEffect: 3,
        scoreEffect: 40,
        outcome: 'Laser pulses vaporized incoming cometary chunks into harmless gas jets that deflected the debris path.',
        scienceFact:
          'The Oort Cloud extends from roughly 2,000 to 100,000 AU, containing trillions of icy planetesimals left over from solar system formation.',
      },
      {
        id: 'shadow-centaur',
        text: 'Maneuver behind the radar shadow of a captured detached centaur asteroid.',
        effects: { power: -6, oxygen: -6, shielding: -10 },
        moraleEffect: -4,
        outcome: 'The centaur body took the impact brunt, though flying ejecta damaged secondary outer radar antennas.',
        scienceFact:
          '90377 Sedna has a perihelion of 76 AU—far outside Neptune\'s reach—demonstrating that outer bodies perturb inner Oort cloud objects.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/solar-system/oort-cloud/',
    icon: '☄️',
  };
}

function buildPlanetXTelemetryDelayEvent(): GameEvent {
  return {
    id: `planetx-telemetry-blackout-${Date.now()}`,
    title: '📡 80-Hour Deep-Space Telemetry Blackout!',
    description:
      'At 600 AU, radio transmissions take nearly 4 days for a round-trip to Earth. An autonomous telemetry packet buffer has experienced an optical desync!',
    severity: 2,
    choices: [
      {
        id: 'autonomous-ai-handoff',
        text: 'Hand over outpost guidance to the onboard autonomous neural heuristic core.',
        effects: { power: -8, oxygen: -3, shielding: 6 },
        moraleEffect: 4,
        scoreEffect: 40,
        outcome: 'Autonomous flight guidance resolved the desync in seconds without needing manual Houston intervention.',
        scienceFact:
          'At 600 AU, electromagnetic signals traveling at the speed of light take ~83 hours for a round-trip to Earth, requiring complete autonomous operation.',
      },
      {
        id: 'reboot-optical-bus',
        text: 'Reboot optical deep-space transceiver and queue compressed telemetry burst.',
        effects: { power: -12, oxygen: 0, shielding: -4 },
        moraleEffect: -2,
        outcome: 'Optical transceiver rebooted cleanly, locking onto the faint guide-star beacon of the Sun.',
        scienceFact:
          'The Vera C. Rubin Observatory\'s 10-year LSST survey in Chile will scan the outer solar system to definitively verify or rule out Planet Nine.',
      },
    ],
    nasaSource: 'https://www.lsst.org/',
    icon: '📡',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 9. MARS SIGNATURE HAZARD EVENTS
// ══════════════════════════════════════════════════════════════════════

function buildDustStormEvent(): GameEvent {
  const severity: 1 | 2 | 3 = random() < 0.3 ? 3 : random() < 0.6 ? 2 : 1;
  const powerLoss = -(severity * 7);

  return {
    id: `dust-storm-${Date.now()}`,
    title: '🌪️ Martian Dust Storm!',
    description:
      severity === 3
        ? 'A massive global dust storm like the one that ended Opportunity\'s mission is bearing down on your outpost!'
        : 'A regional dust storm is covering your solar panels in fine Martian regolith dust.',
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
          'Mars dust grains are very fine — about the size of particles in cigarette smoke — and electrostatic forces make them stick to everything!',
      },
    ],
    nasaSource: 'https://mars.nasa.gov/mars2020/weather/',
    icon: '🌪️',
  };
}

function buildPerchlorateEvent(): GameEvent {
  return {
    id: `perchlorate-${Date.now()}`,
    title: '🧪 Toxic Perchlorate Regolith Contamination!',
    description:
      'High concentrations of toxic perchlorate salts in the Martian soil have breached outer airlock decontamination filters!',
    severity: 2,
    choices: [
      {
        id: 'thermal-decomp',
        text: 'Run catalytic thermal decomposition scrubbers to convert perchlorates to O₂.',
        effects: { power: -10, oxygen: 8, shielding: 4 },
        moraleEffect: 3,
        scoreEffect: 30,
        outcome: 'Thermal scrubbers decomposed the salts, neutralizing the toxins and generating +8% breathable oxygen!',
        scienceFact:
          'Martian regolith contains 0.5% to 1% toxic perchlorates, which can be heated to 400°C to release oxygen for life support.',
      },
      {
        id: 'purge-airlock',
        text: 'Seal contaminated vestibule and execute a high-pressure nitrogen airlock purge.',
        effects: { power: -5, oxygen: -8, shielding: -6 },
        moraleEffect: -4,
        outcome: 'The purge eliminated the dust, though precious life-support nitrogen was lost to the Martian vacuum.',
        scienceFact:
          'NASA\'s Phoenix lander first discovered perchlorates in Martian soil in 2008, presenting a key hazard for future human boots on Mars.',
      },
    ],
    nasaSource: 'https://mars.nasa.gov/news/',
    icon: '🧪',
  };
}

function buildDustDevilEvent(): GameEvent {
  return {
    id: `dust-devil-${Date.now()}`,
    title: '🌀 Towering Martian Dust Devil Vortex!',
    description:
      'A kilometer-tall convective dust devil passes directly across the outpost habitat compound!',
    severity: 1,
    choices: [
      {
        id: 'let-wind-clean',
        text: 'Allow vortex winds to scour accumulated dust off solar arrays.',
        effects: { power: 12, oxygen: 0, shielding: -4 },
        moraleEffect: 4,
        scoreEffect: 25,
        outcome: 'Fortuitous cleaning event! The dust devil swept panels clean, boosting solar generation by +12% Power!',
        scienceFact:
          'NASA\'s Spirit and Opportunity rovers were repeatedly saved when passing dust devils blew dust off their solar panels, extending their missions by years.',
      },
      {
        id: 'secure-clamps',
        text: 'Engage magnetic ground anchor clamps and shelter rovers.',
        effects: { power: -4, oxygen: -2, shielding: 6 },
        moraleEffect: 1,
        outcome: 'Rovers were secured safely. The dust devil swept past without incident.',
        scienceFact:
          'NASA\'s Perseverance rover recorded the first audio of a Martian dust devil in 2021 using its SuperCam microphone.',
      },
    ],
    nasaSource: 'https://science.nasa.gov/mission/perseverance/',
    icon: '🌀',
  };
}

function buildSubsurfacePermafrostEvent(): GameEvent {
  return {
    id: `permafrost-collapse-${Date.now()}`,
    title: '❄️ Subsurface Permafrost Subsidence!',
    description:
      'Thermal leakage from outpost habitat foundation warms buried ground ice, causing the ground beneath the reactor module to settle!',
    severity: 2,
    choices: [
      {
        id: 'cryo-stabilize-piling',
        text: 'Inject cryogenic thermal foam to re-freeze foundation pilings.',
        effects: { power: -11, oxygen: 4, shielding: 8 },
        moraleEffect: 2,
        scoreEffect: 25,
        outcome: 'Cryo-foam refroze the permafrost, stabilizing the outpost foundation and sealing melted ice for life support.',
        scienceFact:
          'Radar data from Mars Express and MRO shows vast sheets of pure water ice buried just 1 to 2 meters beneath the Martian surface.',
      },
      {
        id: 'redistribute-load',
        text: 'Deploy hydraulic auxiliary outriggers to redistribute structural load.',
        effects: { power: -5, oxygen: -4, shielding: -8 },
        moraleEffect: -3,
        outcome: 'Outriggers arrested the tilt, though structural bulkheads endured mechanical twisting stresses.',
        scienceFact:
          'Future Martian colonies will require insulated structural pilings to prevent waste heat from melting ice-rich permafrost.',
      },
    ],
    nasaSource: 'https://mars.nasa.gov/mro/',
    icon: '❄️',
  };
}

// ══════════════════════════════════════════════════════════════════════
// 10. UNIVERSAL MISSION EVENTS (DYNAMICALLY ADAPTED BY PLANET)
// ══════════════════════════════════════════════════════════════════════

function buildSolarParticleEvent(planetId: PlanetId = 'earth'): GameEvent {
  const donki = donkiEvents.length > 0 ? pick(donkiEvents) : null;
  const source = donki?.sourceUrl ?? 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
  const intensity = donki?.intensity ?? 5;
  const severity: 1 | 2 | 3 = intensity >= 7 ? 3 : intensity >= 4 ? 2 : 1;

  let desc = donki
    ? `A ${donki.classType ?? donki.eventType} solar event has been detected! ${donki.description}`
    : 'NASA\'s DONKI space weather system warns of incoming solar energetic particles!';

  let planetShelterFact = 'On deep space missions, astronauts shelter behind water tanks — hydrogen in water is remarkably effective at absorbing radiation!';
  if (planetId === 'earth') {
    desc += ' Charged particles funnel down the geomagnetic field toward LEO.';
    planetShelterFact = 'Earth\'s magnetosphere deflects most solar radiation, but stations in polar or high orbits face severe particle flux.';
  } else if (planetId === 'jupiter') {
    desc += ' Solar particles collide with Jupiter\'s immense magnetosphere, amplifying the trapped radiation belts.';
    planetShelterFact = 'Jupiter\'s magnetic field traps high-energy particles, requiring heavy titanium shielding.';
  } else if (planetId === 'mercury') {
    desc += ' With no substantial atmosphere or shielding at 0.38 AU, the solar particle flux is brutal!';
    planetShelterFact = 'Radiation intensity follows the inverse-square law: Mercury receives nearly 10 times more solar radiation than Earth.';
  } else if (planetId === 'planet_x') {
    desc = 'An anomalous interstellar cosmic ray burst penetrates the outer heliosphere boundary!';
    planetShelterFact = 'Beyond the heliopause at ~120+ AU, spacecraft are exposed to unattenuated Galactic Cosmic Rays (GCRs).';
  }

  const choices: EventChoice[] = [
    {
      id: 'boost-shields',
      text: 'Divert power to boost active radiation deflection shields!',
      effects: { power: -(severity * 8), oxygen: 0, shielding: 15 },
      moraleEffect: -2,
      outcome: 'The extra shielding held! Crew vitals are green, but power reserves are lower.',
      scienceFact: 'NASA\'s DONKI system tracks real coronal mass ejections and solar energetic particle events across the Solar System.',
    },
    {
      id: 'shelter-in-place',
      text: 'Order crew into the reinforced radiation storm cellar.',
      effects: { power: 0, oxygen: -5, shielding: -(severity * 6) },
      moraleEffect: -5,
      outcome: 'The crew sheltered in the reinforced core. Shields took hits, but nobody was harmed.',
      scienceFact: planetShelterFact,
    },
  ];

  return {
    id: `solar-particle-${Date.now()}`,
    title: '☀️ Solar Particle Event Alert!',
    description: desc,
    severity,
    choices,
    nasaSource: source,
    icon: '☀️',
  };
}

function buildEquipmentMalfunctionEvent(): GameEvent {
  return {
    id: `equipment-malfunction-${Date.now()}`,
    title: '⚠️ Equipment Malfunction!',
    description:
      'The environmental life support console is beeping — an oxygen catalytic recycler has jammed! You need to act fast.',
    severity: 2,
    choices: [
      {
        id: 'quick-fix',
        text: 'Attempt a rapid mechanical patch using spare components.',
        effects: { power: -5, oxygen: -8, shielding: 0 },
        moraleEffect: 3,
        scoreEffect: 15,
        outcome: 'Nice work, cadet! The recycler is back online and holding nominal pressure.',
        scienceFact:
          'The International Space Station\'s ECLSS system recycles over 98% of crew water from sweat, humidity, and breath!',
      },
      {
        id: 'switch-backup',
        text: 'Switch to the secondary redundant life support loop.',
        effects: { power: -10, oxygen: 0, shielding: 0 },
        moraleEffect: 0,
        outcome: 'The backup loop engaged smoothly, but it draws more continuous power than the primary.',
        scienceFact:
          'Critical aerospace life support systems always maintain quadruple redundancy to prevent single-point failures.',
      },
    ],
    nasaSource: 'https://www.nasa.gov/mission_pages/station/research/experiments_category',
    icon: '⚠️',
  };
}

function buildCommunicationWindowEvent(planetId: PlanetId = 'earth'): GameEvent {
  let title = '📡 Communication Window!';
  let desc = 'Orbital telemetry geometry is clear — you have an optimal communication window to Mission Control!';
  let fact = 'Deep Space Network stations maintain continuous coverage of interplanetary missions.';
  let latencyNote = 'Messages take time to travel at the speed of light.';

  if (planetId === 'earth') {
    title = '📡 Ground Station Line-of-Sight Uplink!';
    desc = 'Your station passes over a high-bandwidth TDRS satellite and White Sands ground terminal!';
    latencyNote = 'Latency is measured in milliseconds (real-time high-definition video downlink).';
    fact = 'NASA\'s Space Network uses Tracking and Data Relay Satellites (TDRS) in geosynchronous orbit for 100% continuous communication.';
  } else if (planetId === 'mars') {
    title = '📡 Mars-Earth Deep Space Network Window!';
    desc = 'Earth has risen above the local horizon with direct line-of-sight to Goldstone DSN antenna arrays.';
    latencyNote = 'Radio signals take 4 to 24 minutes one-way at the speed of light.';
    fact = 'Because Earth and Mars orbit at different speeds, the communication time delay ranges from 4 minutes at closest approach to 24 minutes at solar conjunction.';
  } else if (planetId === 'jupiter') {
    title = '📡 Jovian Deep Space Network Relay Window!';
    desc = 'Jupiter\'s magnetic interference has cleared, providing a high-gain radio window to Earth.';
    latencyNote = 'Radio signals take 33 to 53 minutes one-way.';
    fact = 'NASA\'s Deep Space Network in California, Spain, and Australia uses 70-meter parabolic dish antennas to receive whisper-quiet signals from the outer planets.';
  } else if (planetId === 'neptune') {
    title = '📡 Neptunian Deep-Field Telemetry Uplink!';
    desc = 'High-gain phased array achieves lock with Deep Space Network receivers on Earth.';
    latencyNote = 'Radio signals take ~4.1 hours one-way (over 8 hours round-trip)!';
    fact = 'When Voyager 2 flew past Neptune in 1989, its radio signal took 4 hours and 6 minutes to travel across 4.4 billion kilometers of space to Earth.';
  } else if (planetId === 'planet_x') {
    title = '📡 80-Hour Deep-Space Telemetry Window!';
    desc = 'Deep Space Network array locks onto your transponder across 600 AU of the outer void.';
    latencyNote = 'Radio signals take ~40 hours one-way (~80 hours round-trip)!';
    fact = 'At 600 AU, communications require massive radio telescopes and autonomous computer guidance to handle the multi-day latency.';
  }

  return {
    id: `comm-window-${Date.now()}`,
    title,
    description: `${desc} (${latencyNote})`,
    severity: 1,
    choices: [
      {
        id: 'send-data',
        text: 'Upload compressed scientific mission data to Earth.',
        effects: { power: -6, oxygen: 0, shielding: 0 },
        scoreEffect: 40,
        moraleEffect: 8,
        outcome: 'Mission Control acknowledged your data packet: "Outstanding telemetry, cadet! Transmitting to science team."',
        scienceFact: fact,
      },
      {
        id: 'request-guidance',
        text: 'Request remote diagnostic calibration from Mission Control.',
        effects: { power: -4, oxygen: 0, shielding: 4 },
        moraleEffect: 5,
        outcome: 'Mission Control uplinked optimized shield parameters and system diagnostics. Shield efficiency boosted!',
        scienceFact:
          'NASA flight controllers calculate antenna pointing angles and Doppler shift adjustments months in advance.',
      },
    ],
    nasaSource: 'https://eyes.nasa.gov/dsn/dsn.html',
    icon: '📡',
  };
}

function buildResearchDiscoveryEvent(): GameEvent {
  const bio = spaceBiology.length > 0 ? pick(spaceBiology) : null;
  const fact = bio?.fact ?? 'Microgravity and space radiation affect biological gene expression, cellular metabolism, and bone density.';
  const source = bio?.sourceUrl ?? 'https://osdr.nasa.gov/bio/';

  return {
    id: `research-discovery-${Date.now()}`,
    title: '🔬 Laboratory Scientific Discovery!',
    description:
      'Your science bay has yielded an unexpected biological or materials breakthrough! How do you want to apply it?',
    severity: 1,
    choices: [
      {
        id: 'publish-findings',
        text: 'Document and downlink scientific findings for maximum mission points.',
        effects: { power: -5, oxygen: -3, shielding: 0 },
        scoreEffect: 60,
        moraleEffect: 6,
        outcome: 'Your research paper is being distributed across NASA centers and international space agencies!',
        scienceFact: fact,
      },
      {
        id: 'apply-locally',
        text: 'Apply the research locally to optimize habitat life support and shielding.',
        effects: { power: 4, oxygen: 6, shielding: 4 },
        moraleEffect: 4,
        outcome: 'Ingenious application! Integrating the experimental findings boosted life support, power, and shielding.',
        scienceFact: fact,
      },
    ],
    nasaSource: source,
    icon: '🔬',
  };
}

function buildMeteoriteImpactEvent(planetId: PlanetId = 'earth'): GameEvent {
  let title = '☄️ Impact Warning!';
  let desc = 'Sensors detect an incoming hypervelocity projectile on a direct intercept vector!';
  let fact1 = 'NASA\'s DART mission proved kinetic impactors can successfully divert dangerous space rocks.';
  let fact2 = 'Planetary surfaces without thick atmospheres sustain thousands of unshielded impacts every year.';

  if (planetId === 'earth') {
    title = '🛰️ Orbital Fragment Impact Emergency!';
    desc = 'Radar tracks a defunct satellite battery casing hurtling toward your station at 7.8 km/s!';
    fact1 = 'Whipple shields vaporize high-speed space debris on contact, distributing the kinetic blast safely.';
    fact2 = 'Earth\'s atmosphere burns up billions of small meteoroids every single day as shooting stars.';
  } else if (planetId === 'mercury') {
    title = '☄️ Sungrazing Comet Fragment Impact!';
    desc = 'An unshielded cometary boulder strikes the bare regolith near the outpost!';
    fact1 = 'With zero atmosphere, even the tiniest pebble strikes Mercury at full interplanetary velocity.';
    fact2 = 'Caloris Basin on Mercury is one of the largest impact basins in the solar system (1,550 km across).';
  } else if (planetId === 'jupiter' || planetId === 'saturn' || planetId === 'uranus' || planetId === 'neptune') {
    title = '☄️ Atmospheric Cometary Bolide Strike!';
    desc = 'A high-speed icy cometary bolide explodes in the upper atmosphere, sending out a supersonic acoustic shockwave!';
    fact1 = 'In 1994, Comet Shoemaker-Levy 9 slammed into Jupiter, creating fireball plumes larger than Earth.';
    fact2 = 'Gas and ice giants act as gravitational vacuums, absorbing frequent cometary impacts that protect the inner planets.';
  }

  return {
    id: `meteorite-impact-${Date.now()}`,
    title,
    description: desc,
    severity: 3,
    choices: [
      {
        id: 'activate-deflectors',
        text: 'Energize emergency deflector shields and Whipple arrays!',
        effects: { power: -15, oxygen: -4, shielding: -6 },
        moraleEffect: -2,
        scoreEffect: 30,
        outcome: 'The deflector shields took the direct brunt! Some shield degradation, but the pressurized habitat held firm.',
        scienceFact: fact1,
      },
      {
        id: 'evacuate-section',
        text: 'Seal pressure bulkheads and isolate the vulnerable habitat module.',
        effects: { power: -5, oxygen: -12, shielding: -14 },
        moraleEffect: -7,
        outcome: 'You evacuated the module just in time. Shields were severely damaged, but the crew is safe.',
        scienceFact: fact2,
      },
    ],
    nasaSource: 'https://science.nasa.gov/planetary-defense/',
    icon: '☄️',
  };
}

// ══════════════════════════════════════════════════════════════════════
// PLANETARY EVENT REGISTRY & DISPATCH
// ══════════════════════════════════════════════════════════════════════

type EventBuilder = (planetId?: PlanetId) => GameEvent;

const PLANET_SPECIFIC_EVENTS: Record<PlanetId, EventBuilder[]> = {
  earth: [
    buildEarthKesslerEvent,
    buildEarthGeomagneticEvent,
    buildEarthAsatEvent,
    buildEarthOrbitalDecayEvent,
  ],
  venus: [
    buildVenusAcidShearEvent,
    buildVenusSuperRotationEvent,
    buildVenusBarometricSpikeEvent,
  ],
  mercury: [
    buildMercuryMagneticReconnectionEvent,
    buildMercuryTerminatorThermalShockEvent,
    buildMercuryMicrometeoriteEvent,
  ],
  jupiter: [
    buildJupiterIoPlasmaTorusEvent,
    buildJupiterGreatRedSpotEvent,
    buildJupiterMagnetosphericEddyEvent,
  ],
  saturn: [
    buildSaturnCryovolcanicPlumeEvent,
    buildSaturnRingPlaneImpactEvent,
    buildSaturnHexagonalVortexEvent,
  ],
  uranus: [
    buildUranusAxialTiltSquallEvent,
    buildUranusDiamondRainEvent,
    buildUranusTumblingMagnetosphereEvent,
  ],
  neptune: [
    buildNeptuneSupersonicJetstreamEvent,
    buildNeptuneTritonTidalShearEvent,
    buildNeptuneDarkSpotSurgeEvent,
  ],
  planet_x: [
    buildPlanetXSednoidPerturbationEvent,
    buildPlanetXOortShowerEvent,
    buildPlanetXTelemetryDelayEvent,
  ],
  mars: [
    buildDustStormEvent,
    buildPerchlorateEvent,
    buildDustDevilEvent,
    buildSubsurfacePermafrostEvent,
  ],
};

const UNIVERSAL_EVENT_BUILDERS: EventBuilder[] = [
  buildSolarParticleEvent,
  buildEquipmentMalfunctionEvent,
  buildCommunicationWindowEvent,
  buildResearchDiscoveryEvent,
  buildMeteoriteImpactEvent,
];

// ── Public API ──────────────────────────────────────────────

/**
 * Decides whether a random event fires this sol/day and returns it (or null).
 * Strictly routes planetary signature hazards to the active world so
 * Mars dust storms never trigger on Earth, Venus, Neptune, etc.
 */
export function generateEvent(state: GameState): GameEvent | null {
  const activeSeed = state.tournamentRngSeed ?? state.weatherSeed;
  if (activeSeed !== undefined) {
    let s = ((activeSeed + state.sol * 1337 + state.usedEventIds.length * 31) >>> 0) || 12345;
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
  let chance = state.isEndlessTournament
    ? getEndlessEventChance(state.sol)
    : EVENT_CHANCE * diff.eventChanceMultiplier;

  // Raise the stakes when a resource is critical
  const anyCritical =
    state.power <= CRITICAL_THRESHOLD ||
    state.oxygen <= CRITICAL_THRESHOLD ||
    state.shielding <= CRITICAL_THRESHOLD;
  if (anyCritical) {
    chance = Math.min(chance * 1.5, 0.95);
  }

  if (random() > chance) return null;

  const currentPlanet: PlanetId = state.planetId || 'earth';
  const planetSpecific = PLANET_SPECIFIC_EVENTS[currentPlanet] || PLANET_SPECIFIC_EVENTS.earth;

  // Combine planet's authentic hazards with universal events adapted to that world
  const candidateBuilders: EventBuilder[] = [...planetSpecific, ...UNIVERSAL_EVENT_BUILDERS];

  // Filter out recently used event builders by prefix if possible
  const unusedBuilders = candidateBuilders.filter((builder) => {
    // Generate a trial event to extract its prefix
    const testEvt = builder(currentPlanet);
    const prefix = testEvt.id.split('-')[0];
    return !state.usedEventIds.some((uid) => uid.startsWith(prefix));
  });

  const pool = unusedBuilders.length > 0 ? unusedBuilders : candidateBuilders;
  const chosenBuilder = pick(pool);
  return chosenBuilder(currentPlanet);
}

/**
 * Returns all event builders for a planet (for testing / preview)
 */
export function getAllEventBuildersForPlanet(planetId: PlanetId = 'earth'): EventBuilder[] {
  const specific = PLANET_SPECIFIC_EVENTS[planetId] || PLANET_SPECIFIC_EVENTS.earth;
  return [...specific, ...UNIVERSAL_EVENT_BUILDERS];
}

/** Legacy backwards-compatible export */
export function getAllEventBuilders(): EventBuilder[] {
  return [...PLANET_SPECIFIC_EVENTS.earth, ...UNIVERSAL_EVENT_BUILDERS];
}
