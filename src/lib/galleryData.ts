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
      title: 'Apollo 17: The Blue Marble (1972)',
      caption: 'Taken by the Apollo 17 crew en route to the Moon at a distance of ~29,000 km, showing the Earth extending from the Mediterranean Sea to Antarctica with polar ice caps and weather systems.',
      mission: 'NASA Apollo 17 Lunar Landing Mission',
      date: '1972-12-07',
      instrument: '70mm Hasselblad Camera with 80mm Zeiss Lens',
      imgSrc: '/gallery/earth/blue_marble.svg',
      hdSrc: '/gallery/earth/blue_marble.svg',
      localPath: '/gallery/earth/blue_marble.svg',
      technicalDetails: { coordinates: '28.0° S, 40.0° E', altitude: '29,000 km', filterBand: 'Ektachrome Color Reversal' },
    },
    {
      id: 'earth-002',
      planetId: 'earth',
      title: 'ISS Orbital Sunrise & City Lights at Night',
      caption: 'The brilliant thin ribbon of Earth\'s atmosphere illuminated by the rising Sun as metropolitan city light webs glitter in gold along the night hemisphere.',
      mission: 'International Space Station (Expedition 65)',
      date: '2021-04-12',
      instrument: 'Nikon D5 Handheld Telephoto / Cupola Bay',
      imgSrc: '/gallery/earth/iss_city_lights.svg',
      hdSrc: '/gallery/earth/iss_city_lights.svg',
      localPath: '/gallery/earth/iss_city_lights.svg',
      technicalDetails: { coordinates: '32.1° N, 14.5° E', altitude: '418 km', filterBand: 'Low-light CMOS night exposure' },
    },
    {
      id: 'earth-003',
      planetId: 'earth',
      title: 'Category 5 Super Typhoon Eyewall from Low Earth Orbit',
      caption: 'A top-down perspective looking into the stadium-effect eye of a category 5 swirling super typhoon over open ocean, revealing the deep blue calm sea framed by spiraling rain bands.',
      mission: 'NASA Earth Observatory / MODIS Expedition Team',
      date: '2019-10-10',
      instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
      imgSrc: '/gallery/earth/hurricane_vortex.svg',
      hdSrc: '/gallery/earth/hurricane_vortex.svg',
      localPath: '/gallery/earth/hurricane_vortex.svg',
      technicalDetails: { coordinates: '19.4° N, 137.8° E', altitude: '408 km', filterBand: 'Multispectral Thermal & Visible' },
    },
    {
      id: 'earth-004',
      planetId: 'earth',
      title: 'Aurora Australis & Borealis Curtains from ISS',
      caption: 'Luminous green and violet curtains of Aurora dancing along Earth\'s geomagnetic field lines, triggered when coronal mass ejection plasma excites high-altitude oxygen atoms.',
      mission: 'NASA / ESA ISS Joint Heliophysics Science',
      date: '2020-08-20',
      instrument: 'Cupola Observation Bay Night Optical Sensor',
      imgSrc: '/gallery/earth/aurora_iss.svg',
      hdSrc: '/gallery/earth/aurora_iss.svg',
      localPath: '/gallery/earth/aurora_iss.svg',
      technicalDetails: { coordinates: '51.3° S, 114.7° E', altitude: '412 km', filterBand: '557.7 nm Oxygen Green Emission' },
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
      title: 'Batygin & Brown (2016) Planet Nine Orbit & eTNO Alignment',
      caption: 'Mathematical orbital simulation published in The Astronomical Journal demonstrating that the eccentric orbits of six distant trans-Neptunian bodies (including Sedna and 2012 VP113) point in the same physical direction with a 0.001% probability of coincidence, perturbed by a 5–10 Earth-mass planet.',
      mission: 'Caltech / Theoretical Planetary Dynamics',
      date: '2016-01-20',
      instrument: 'N-body Gravitational Perturbation Integrator',
      imgSrc: '/gallery/planet_x/planet_nine_orbit.svg',
      hdSrc: '/gallery/planet_x/planet_nine_orbit.svg',
      localPath: '/gallery/planet_x/planet_nine_orbit.svg',
      technicalDetails: { coordinates: 'RA 02h 45m, Dec +12° (Predicted Aphelion)', altitude: '~400–800 AU', filterBand: 'N-body Orbital Resonance' },
    },
    {
      id: 'planetx-002',
      planetId: 'planet_x',
      title: 'Extreme Trans-Neptunian Object 90377 Sedna Discovery',
      caption: 'Discovered in 2003 by Mike Brown, Chad Trujillo, and David Rabinowitz at Palomar Observatory. Sedna\'s extreme detached orbit has a perihelion of 76 AU—far beyond Neptune\'s gravitational reach—indicating a massive outer perturber pulled it away from the Kuiper Belt.',
      mission: 'Palomar Observatory / NASA Spitzer Space Telescope',
      date: '2003-11-14',
      instrument: 'Samuel Oschin 48-inch Telescope & 172-Megapixel QUEST CCD',
      imgSrc: '/gallery/planet_x/sedna_discovery.svg',
      hdSrc: '/gallery/planet_x/sedna_discovery.svg',
      localPath: '/gallery/planet_x/sedna_discovery.svg',
      technicalDetails: { coordinates: 'RA 03h 42m, Dec +07° 53\'', altitude: '90 AU (Current Distance)', filterBand: 'Optical Red & Spitzer Mid-IR' },
    },
    {
      id: 'planetx-003',
      planetId: 'planet_x',
      title: 'Vera C. Rubin Observatory (LSST) Planet Nine Search Field',
      caption: 'The 8.4-meter Simonyi Survey Telescope in Cerro Pachón, Chile. Equipped with the world\'s largest 3,200-megapixel digital camera, the 10-year Legacy Survey of Space and Time (LSST) will map the deep southern sky to directly detect or definitively rule out Planet Nine.',
      mission: 'NSF / DOE Vera C. Rubin Observatory (LSST)',
      date: '2024-05-15',
      instrument: '3.2-Gigapixel LSST Camera & 8.4m Simonyi Optical Mirror',
      imgSrc: '/gallery/planet_x/rubin_lsst_search.svg',
      hdSrc: '/gallery/planet_x/rubin_lsst_search.svg',
      localPath: '/gallery/planet_x/rubin_lsst_search.svg',
      technicalDetails: { coordinates: 'Cerro Pachón, Chile (-30.24° S, 70.74° W)', altitude: '2,663 m Ground Elevation', filterBand: 'ugrizy Broad Optical Spectrum' },
    },
    {
      id: 'planetx-004',
      planetId: 'planet_x',
      title: 'Clyde Tombaugh 1930 Blink Comparator Discovery Plates',
      caption: 'Historic photographic glass plates taken at Lowell Observatory in Flagstaff, Arizona. In February 1930, 24-year-old astronomer Clyde Tombaugh compared photographic plates using a Zeiss blink comparator, detecting a faint 15th-magnitude dot shifting 3.5 millimeters—the first discovery in the search for Planet X.',
      mission: 'Lowell Observatory 13-inch Lawrence Lowell Telescope',
      date: '1930-02-18',
      instrument: '13-inch Astrograph & Zeiss Blink Comparator',
      imgSrc: '/gallery/planet_x/lowell_tombaugh_plate.svg',
      hdSrc: '/gallery/planet_x/lowell_tombaugh_plate.svg',
      localPath: '/gallery/planet_x/lowell_tombaugh_plate.svg',
      technicalDetails: { coordinates: 'Delta Geminorum Field', altitude: 'Flagstaff, AZ (2,210 m)', filterBand: 'Silver Halide Glass Emulsion' },
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
