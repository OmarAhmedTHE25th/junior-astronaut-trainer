// ─── Junior Astronaut Mission Trainer – Multi-Planet Reconnaissance Gallery Data ───
// Curated high-resolution deep-space photography, rover imagery, and planetary scans
// across all 9 Solar System campaign expedition worlds.

import type { PlanetId } from './planetCartridges';
import roverPhotosData from '@/data/mars-rover-photos.json';

export interface GalleryPhoto {
  id: string;
  planetId: PlanetId;
  title: string;
  caption: string;
  mission: string;
  date: string;
  instrument: string;
  imgSrc: string;
  hdSrc?: string;
  localPath?: string;
  technicalDetails?: {
    coordinates?: string;
    altitude?: string;
    filterBand?: string;
  };
}

export const PLANET_GALLERY_PHOTOS: Record<PlanetId, GalleryPhoto[]> = {
  earth: [
    {
      id: 'earth-001',
      planetId: 'earth',
      title: 'Earth Atmosphere & Orbital Sunset from ISS',
      caption: 'The brilliant thin layer of Earth\'s atmosphere illuminated by solar rays as the International Space Station orbits 254 miles above the Pacific Ocean.',
      mission: 'International Space Station (Expedition 64)',
      date: '2021-04-12',
      instrument: 'Nikon D5 Handheld Telephoto',
      imgSrc: 'https://images-assets.nasa.gov/image/iss064e000965/iss064e000965~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/iss064e000965/iss064e000965~orig.jpg',
      localPath: '/gallery/earth/orbital_sunset.jpg',
      technicalDetails: { coordinates: '0.0° N, 160.2° W', altitude: '412 km', filterBand: 'Visible RGB' },
    },
    {
      id: 'earth-002',
      planetId: 'earth',
      title: 'Aurora Australis & Night Lights over Indian Ocean',
      caption: 'Green and violet ribbons of Aurora Australis dance above the southern curve of Earth, triggered by solar wind particles guided down Earth\'s magnetic field lines.',
      mission: 'NASA / ESA ISS Joint Science',
      date: '2020-08-20',
      instrument: 'Cupola Observation Bay Night Sensor',
      imgSrc: 'https://images-assets.nasa.gov/image/iss063e078778/iss063e078778~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/iss063e078778/iss063e078778~orig.jpg',
      localPath: '/gallery/earth/aurora_australis.jpg',
      technicalDetails: { coordinates: '51.3° S, 114.7° E', altitude: '418 km', filterBand: 'Long-exposure low-light' },
    },
    {
      id: 'earth-003',
      planetId: 'earth',
      title: 'Eye of Category 5 Super Typhoon from Low Orbit',
      caption: 'A breathtaking and terrifying top-down perspective into the stadium-effect eye of a super typhoon swirling over the Western Pacific Basin.',
      mission: 'Earth Science Expedition Team',
      date: '2019-10-10',
      instrument: 'MODIS Satellite Multispectral Imager',
      imgSrc: 'https://images-assets.nasa.gov/image/iss060e042398/iss060e042398~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/iss060e042398/iss060e042398~orig.jpg',
      localPath: '/gallery/earth/super_typhoon.jpg',
      technicalDetails: { coordinates: '19.4° N, 137.8° E', altitude: '408 km', filterBand: 'Infrared & Visible' },
    },
    {
      id: 'earth-004',
      planetId: 'earth',
      title: 'Orbital Shrapnel & Space Debris Simulation Map',
      caption: 'NASA Orbital Debris Program visualization tracking thousands of high-speed defunct satellites, spent rocket casings, and fragment clouds in Low Earth Orbit.',
      mission: 'NASA Orbital Debris Program Office',
      date: '2023-01-15',
      instrument: 'SSN Radar Cross-Section Synthesizer',
      imgSrc: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001465/GSFC_20171208_Archive_e001465~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001465/GSFC_20171208_Archive_e001465~orig.jpg',
      localPath: '/gallery/earth/orbital_debris.jpg',
      technicalDetails: { coordinates: 'Low Earth Orbit (300-2,000 km)', altitude: 'Leo Grid', filterBand: 'Radar Doppler synthetic' },
    },
  ],

  mars: [
    ...roverPhotosData.slice(0, 8).map((p) => ({
      id: p.id,
      planetId: 'mars' as PlanetId,
      title: `${p.rover} Rover on Mars (Sol ${p.sol})`,
      caption: p.description,
      mission: `NASA Mars Exploration Program (${p.rover})`,
      date: p.earthDate,
      instrument: p.camera,
      imgSrc: p.imgSrc,
      hdSrc: p.hdSrc,
      localPath: `/gallery/mars/${p.id}.jpg`,
      technicalDetails: { coordinates: 'Jezero / Gale Crater', altitude: 'Surface Mastcam', filterBand: p.camera },
    })),
  ],

  venus: [
    {
      id: 'venus-001',
      planetId: 'venus',
      title: 'Magellan Full-Disk Radar Topography',
      caption: 'Global synthetic aperture radar mosaic of Venus assembled from 1,200 radar sweeps, piercing through the opaque sulfuric cloud blanket to reveal continent-sized highland plateaus.',
      mission: 'NASA Magellan Mission',
      date: '1992-05-25',
      instrument: 'Synthetic Aperture Radar (SAR)',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA00104/PIA00104~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA00104/PIA00104~orig.jpg',
      localPath: '/gallery/venus/magellan_radar.jpg',
      technicalDetails: { coordinates: '0° N, 0° E', altitude: 'Orbital SAR', filterBand: '12.6 cm S-Band Microwave' },
    },
    {
      id: 'venus-002',
      planetId: 'venus',
      title: 'Ultraviolet Super-Rotation Cloud Waves',
      caption: 'High-contrast ultraviolet observation capturing rapid super-rotating cloud dynamics and sulfuric acid cloud belts racing around Venus at 360 km/h.',
      mission: 'JAXA Akatsuki / NASA Planetary Data System',
      date: '2016-12-06',
      instrument: 'Ultraviolet Imager (UVI)',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA00072/PIA00072~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA00072/PIA00072~orig.jpg',
      localPath: '/gallery/venus/uv_clouds.jpg',
      technicalDetails: { coordinates: 'Upper Cloud Deck', altitude: '65,000 km', filterBand: '283 nm & 365 nm UV' },
    },
    {
      id: 'venus-003',
      planetId: 'venus',
      title: 'Maat Mons 8 km Volcanic Caldera',
      caption: 'Computer-generated perspective view of Maat Mons, the highest volcano on Venus rising 5 miles (8 km) above the volcanic plains, mapped from Magellan radar altimetry.',
      mission: 'NASA Magellan Radar Mapping',
      date: '1991-08-14',
      instrument: 'Radar Altimeter & Radiometer',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA00254/PIA00254~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA00254/PIA00254~orig.jpg',
      localPath: '/gallery/venus/maat_mons.jpg',
      technicalDetails: { coordinates: '0.5° N, 194.6° E', altitude: '8,000 m peak', filterBand: 'Radar Topographic' },
    },
  ],

  mercury: [
    {
      id: 'mercury-001',
      planetId: 'mercury',
      title: 'MESSENGER Enhanced-Color Mercury Global View',
      caption: 'Stunning enhanced-color mosaic revealing crustal compositional differences, volcanic plains, and impact rays radiating thousands of kilometers across Mercury\'s surface.',
      mission: 'NASA MESSENGER Mission',
      date: '2013-02-18',
      instrument: 'Mercury Dual Imaging System (MDIS)',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA16853/PIA16853~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA16853/PIA16853~orig.jpg',
      localPath: '/gallery/mercury/enhanced_color.jpg',
      technicalDetails: { coordinates: 'Full Disk', altitude: '450 km', filterBand: 'Narrowband Multispectral (11 filters)' },
    },
    {
      id: 'mercury-002',
      planetId: 'mercury',
      title: 'Caloris Basin Colossal Impact Basin',
      caption: 'The immense Caloris Basin spanning 950 miles (1,525 km), filled with ridged volcanic lava sheets and bordered by concentric mountain rings over a mile high.',
      mission: 'NASA MESSENGER Mission',
      date: '2008-01-14',
      instrument: 'Wide-Angle Multispectral Camera',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA11364/PIA11364~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA11364/PIA11364~orig.jpg',
      localPath: '/gallery/mercury/caloris_basin.jpg',
      technicalDetails: { coordinates: '30.5° N, 189.8° W', altitude: '320 km', filterBand: 'Color-enhanced false color' },
    },
    {
      id: 'mercury-003',
      planetId: 'mercury',
      title: 'Scorched Twilight Terminator Ridge',
      caption: 'High-resolution reconnaissance along the razor-thin border between 430°C solar-facing terrain and -180°C deep night frost, where the Hermean crawler navigates.',
      mission: 'NASA MESSENGER Final Low-Altitude Phase',
      date: '2015-03-22',
      instrument: 'Narrow Angle High-Res Camera',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA19416/PIA19416~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA19416/PIA19416~orig.jpg',
      localPath: '/gallery/mercury/terminator_scarp.jpg',
      technicalDetails: { coordinates: 'Enterprise Rupes', altitude: '15 km', filterBand: 'Monochrome high-definition' },
    },
  ],

  jupiter: [
    {
      id: 'jupiter-001',
      planetId: 'jupiter',
      title: 'Juno Close Perijove Swirling Vortex Belts',
      caption: 'Intricate atmospheric storms and cyclonic eddies swirling in Jupiter\'s North Temperate Belt, captured by Juno during a razor-close 12,000 km flyby above the cloud tops.',
      mission: 'NASA Juno Mission',
      date: '2019-05-29',
      instrument: 'JunoCam Optical Telephoto',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA22949/PIA22949~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA22949/PIA22949~orig.jpg',
      localPath: '/gallery/jupiter/juno_swirls.jpg',
      technicalDetails: { coordinates: 'North Equatorial Belt', altitude: '12,600 km', filterBand: 'Visible Methane Absorption' },
    },
    {
      id: 'jupiter-002',
      planetId: 'jupiter',
      title: 'The Great Red Spot in Vivid 4K Resolution',
      caption: 'Direct high-resolution optical pass looking directly into the crimson center of the solar system\'s greatest storm, showing internal turbulence and counter-rotating wind ribbons.',
      mission: 'NASA Juno Mission (Perijove 7)',
      date: '2017-07-11',
      instrument: 'JunoCam Multispectral Array',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA21775/PIA21775~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA21775/PIA21775~orig.jpg',
      localPath: '/gallery/jupiter/great_red_spot.jpg',
      technicalDetails: { coordinates: '22° S, 140° W', altitude: '9,000 km', filterBand: 'RGB Optical Synthesis' },
    },
    {
      id: 'jupiter-003',
      planetId: 'jupiter',
      title: 'Europa Silhouette Rising Against Jovian Clouds',
      caption: 'The smooth, fractured ice crust of ocean moon Europa captured against the colossal backdrop of Jupiter\'s ammonia cirrus cloud layers.',
      mission: 'NASA New Horizons Jupiter Flyby',
      date: '2007-02-28',
      instrument: 'Long Range Reconnaissance Imager (LORRI)',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA09355/PIA09355~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA09355/PIA09355~orig.jpg',
      localPath: '/gallery/jupiter/europa_silhouette.jpg',
      technicalDetails: { coordinates: 'Jovian Limb Horizon', altitude: '2.3 million km', filterBand: 'Panchromatic high-resolution' },
    },
  ],

  saturn: [
    {
      id: 'saturn-001',
      planetId: 'saturn',
      title: 'Cassini Back-Lit Ring Eclipsed Panorama',
      caption: 'An awe-inspiring masterpiece: Saturn eclipsing the Sun from 1.3 million km away, illuminating billions of water-ice particles in the rings and revealing Earth as a tiny blue dot.',
      mission: 'NASA Cassini-Huygens Mission',
      date: '2006-09-15',
      instrument: 'Cassini Wide-Angle Science Camera',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA08329/PIA08329~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA08329/PIA08329~orig.jpg',
      localPath: '/gallery/saturn/eclipsed_rings.jpg',
      technicalDetails: { coordinates: 'Saturn Shadow Plane', altitude: '1,300,000 km', filterBand: '165-image synthesized panorama' },
    },
    {
      id: 'saturn-002',
      planetId: 'saturn',
      title: 'Enceladus Water Ice Cryo-Plumes in Sunlight',
      caption: 'Towering supersonic jets of water vapor and organic salty ice crystals venting from hydrothermal vents at Enceladus\'s south pole, directly feeding Saturn\'s E-Ring.',
      mission: 'NASA Cassini-Huygens Mission',
      date: '2010-11-30',
      instrument: 'Narrow-Angle Camera & UVIS',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA12773/PIA12773~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA12773/PIA12773~orig.jpg',
      localPath: '/gallery/saturn/enceladus_plumes.jpg',
      technicalDetails: { coordinates: 'Tiger Stripe Fractures', altitude: '14,000 km', filterBand: 'Backlit High-Phase Optical' },
    },
    {
      id: 'saturn-003',
      planetId: 'saturn',
      title: 'North Polar Geometric Hexagon Jet Stream',
      caption: 'Cassini infrared view of Saturn\'s massive six-sided polar storm, a persistent geometric atmospheric vortex wide enough to comfortably hold four Earths side-by-side.',
      mission: 'NASA Cassini-Huygens Mission',
      date: '2013-06-25',
      instrument: 'Visible & Infrared Mapping Spectrometer',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA17652/PIA17652~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA17652/PIA17652~orig.jpg',
      localPath: '/gallery/saturn/polar_hexagon.jpg',
      technicalDetails: { coordinates: '89.9° N Polar Axis', altitude: '650,000 km', filterBand: 'Near-Infrared False Color' },
    },
  ],

  uranus: [
    {
      id: 'uranus-001',
      planetId: 'uranus',
      title: 'Voyager 2 Historic True-Color Cyan Crescent',
      caption: 'The iconic true-color image of Uranus captured by Voyager 2 during humanity\'s only close reconnaissance flyby in January 1986, revealing faint methane cloud smog.',
      mission: 'NASA Voyager 2 Planetary Flyby',
      date: '1986-01-25',
      instrument: 'Voyager Narrow Angle Vidicon Camera',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA01360/PIA01360~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA01360/PIA01360~orig.jpg',
      localPath: '/gallery/uranus/voyager_cyan.jpg',
      technicalDetails: { coordinates: 'Sun-Facing Pole', altitude: '81,500 km', filterBand: 'Blue, Green & Clear Composite' },
    },
    {
      id: 'uranus-002',
      planetId: 'uranus',
      title: 'James Webb NIRCam Infrared Ring System',
      caption: 'Cutting-edge infrared imagery from the James Webb Space Telescope revealing 11 of Uranus\'s 13 pitch-black rings with razor-sharp brilliance alongside bright polar storms.',
      mission: 'NASA / ESA / CSA James Webb Space Telescope',
      date: '2023-04-06',
      instrument: 'NIRCam (Near-Infrared Camera)',
      imgSrc: 'https://images-assets.nasa.gov/image/STScI-01GWQB84E59C7Z1G66D57G14W3/STScI-01GWQB84E59C7Z1G66D57G14W3~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/STScI-01GWQB84E59C7Z1G66D57G14W3/STScI-01GWQB84E59C7Z1G66D57G14W3~orig.jpg',
      localPath: '/gallery/uranus/jwst_rings.jpg',
      technicalDetails: { coordinates: 'Equatorial Ring Arc', altitude: 'L2 Deep Space', filterBand: 'F140M & F300M Infrared' },
    },
  ],

  neptune: [
    {
      id: 'neptune-001',
      planetId: 'neptune',
      title: 'Voyager 2 Great Dark Spot & Supersonic Cirrus',
      caption: 'Voyager 2 image showing Neptune\'s Great Dark Spot accompanied by bright white methane cirrus cloud streaks nicknamed "Scooter", whipping across the atmosphere at 2,100 km/h.',
      mission: 'NASA Voyager 2 Historic Flyby',
      date: '1989-08-20',
      instrument: 'Voyager Narrow Angle Imaging Sensor',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA01142/PIA01142~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/PIA01142/PIA01142~orig.jpg',
      localPath: '/gallery/neptune/great_dark_spot.jpg',
      technicalDetails: { coordinates: '22° S, 110° W', altitude: '4,400,000 km', filterBand: 'Clear, Green, & Violet Filters' },
    },
    {
      id: 'neptune-002',
      planetId: 'neptune',
      title: 'JWST Luminous Methane Rings & Frozen Triton',
      caption: 'Deep-field near-infrared exposure from the James Webb Space Telescope showing Neptune\'s ghostly ring system and its frozen, backward-orbiting captured moon Triton.',
      mission: 'NASA / ESA / CSA James Webb Space Telescope',
      date: '2022-09-21',
      instrument: 'NIRCam Infrared Array',
      imgSrc: 'https://images-assets.nasa.gov/image/STScI-01GCK7A4S0P744F67HWW2P3D57/STScI-01GCK7A4S0P744F67HWW2P3D57~thumb.jpg',
      hdSrc: 'https://images-assets.nasa.gov/image/STScI-01GCK7A4S0P744F67HWW2P3D57/STScI-01GCK7A4S0P744F67HWW2P3D57~orig.jpg',
      localPath: '/gallery/neptune/jwst_neptune.jpg',
      technicalDetails: { coordinates: 'Triton Orbit Plane', altitude: 'L2 Space Orbit', filterBand: 'Near-Infrared Synthetic Color' },
    },
  ],

  planet_x: [
    {
      id: 'planetx-001',
      planetId: 'planet_x',
      title: 'Classified: Gravitational Microlensing Singularity',
      caption: 'DSN Sector X Telemetry Scan: High-energy sub-stellar microlensing fringe observed at 620 AU. Starlight from distant background galactic clusters bends along a sharp Einstein ring.',
      mission: 'Classified Deep Space Network Telemetry Relay',
      date: '2026-10-31',
      instrument: 'Ultra-Deep Quantum Gravimetric Array',
      imgSrc: '/planets/planet_x.png',
      hdSrc: '/planets/planet_x.png',
      localPath: '/gallery/planet_x/microlensing.jpg',
      technicalDetails: { coordinates: 'RA 02h 45m, Dec +12° 30\'', altitude: '620 AU', filterBand: 'Gravitational Microlensing' },
    },
    {
      id: 'planetx-002',
      planetId: 'planet_x',
      title: 'Corrupted Optical Burst // Decryption Key Missing',
      caption: 'Automated drone probe encounter file: Telemetry stream corrupted by localized causality distortion. Optical CMOS array overwhelmed by non-baryonic Cherenkov radiation.',
      mission: 'Outpost X Autonomous Vanguard Drone',
      date: '2026-11-04',
      instrument: 'Cryogenic CCD Radiation Sensor',
      imgSrc: '/planets/planet_x.png',
      hdSrc: '/planets/planet_x.png',
      localPath: '/gallery/planet_x/corrupted_burst.jpg',
      technicalDetails: { coordinates: 'Trans-Neptunian Kuiper Cliff', altitude: '590 AU', filterBand: 'Cherenkov Luminescence' },
    },
  ],
};

/** Get all photos combined across all planets */
export function getAllGalleryPhotos(): GalleryPhoto[] {
  return Object.values(PLANET_GALLERY_PHOTOS).flat();
}

/** Get photos for a specific planet */
export function getPhotosForPlanet(planetId: PlanetId): GalleryPhoto[] {
  return PLANET_GALLERY_PHOTOS[planetId] || [];
}
