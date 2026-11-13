// ============================================================
// NASA Data Index — Junior Astronaut Mission Trainer
// Re-exports all curated NASA data with TypeScript types
// ============================================================

import donkiEventsData from "./donki-events.json";
import radlabDosesData from "./radlab-doses.json";
import marsRoverPhotosData from "./mars-rover-photos.json";
import spaceBiologyData from "./space-biology.json";
import nasaFactsData from "./nasa-facts.json";

// -----------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------

/** Solar event types from NASA DONKI */
export type SolarEventType = "Solar Flare" | "CME" | "Solar Energetic Particle";

/** A curated solar/space weather event from NASA DONKI */
export interface DonkiEvent {
  id: string;
  eventType: SolarEventType;
  date: string;
  classType: string;
  intensity: number; // 1-10 scale
  description: string;
  sourceUrl: string;
}

/** A radiation dose measurement from ISS RadLab */
export interface RadlabDose {
  instrument: string;
  location: string;
  startDate: string;
  endDate: string;
  absorbedDoseRate: number; // μGy/day
  description: string;
  sourceUrl: string;
}

/** Mars rover names */
export type RoverName = "Curiosity" | "Perseverance" | "Opportunity" | "Spirit";

/** A curated Mars rover photo entry */
export interface MarsRoverPhoto {
  id: string;
  rover: RoverName;
  sol: number;
  camera: string;
  earthDate: string;
  imgSrc: string;
  description: string;
}

/** Space biology research topics */
export type BiologyTopic =
  | "bone_density"
  | "muscle_loss"
  | "immune_system"
  | "sleep"
  | "radiation_health"
  | "cardiovascular"
  | "vision";

/** A curated space biology research fact from NASA OSDR */
export interface SpaceBiologyFact {
  id: string;
  topic: BiologyTopic;
  fact: string;
  studyReference: string;
  severity: number; // 1-5
  mitigationStrategy: string;
  sourceUrl: string;
}

/** NASA fact categories for between-turn popups */
export type FactCategory =
  | "mars"
  | "radiation"
  | "life_support"
  | "food"
  | "power"
  | "exploration";

/** An educational NASA fact for between-turn display */
export interface NASAFact {
  id: string;
  category: FactCategory;
  title: string;
  fact: string;
  nasaSource: string;
  funRating: number; // 1-5
}

// -----------------------------------------------------------
// Data Exports (typed)
// -----------------------------------------------------------

export const donkiEvents: DonkiEvent[] = donkiEventsData as DonkiEvent[];
export const radlabDoses: RadlabDose[] = radlabDosesData as RadlabDose[];
export const marsRoverPhotos: MarsRoverPhoto[] = marsRoverPhotosData as MarsRoverPhoto[];
export const spaceBiology: SpaceBiologyFact[] = spaceBiologyData as SpaceBiologyFact[];
export const nasaFacts: NASAFact[] = nasaFactsData as NASAFact[];

// -----------------------------------------------------------
// Helper utilities
// -----------------------------------------------------------

/** Get DONKI events filtered by type */
export function getDonkiEventsByType(type: SolarEventType): DonkiEvent[] {
  return donkiEvents.filter((e) => e.eventType === type);
}

/** Get a random DONKI event, optionally filtered by minimum intensity */
export function getRandomDonkiEvent(minIntensity = 1): DonkiEvent {
  const filtered = donkiEvents.filter((e) => e.intensity >= minIntensity);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get RadLab dose entries sorted by dose rate (highest first) */
export function getHighestDoses(limit = 5): RadlabDose[] {
  return [...radlabDoses]
    .sort((a, b) => b.absorbedDoseRate - a.absorbedDoseRate)
    .slice(0, limit);
}

/** Get Mars rover photos filtered by rover name */
export function getPhotosByRover(rover: RoverName): MarsRoverPhoto[] {
  return marsRoverPhotos.filter((p) => p.rover === rover);
}

/** Get a random Mars rover photo */
export function getRandomMarsPhoto(): MarsRoverPhoto {
  return marsRoverPhotos[Math.floor(Math.random() * marsRoverPhotos.length)];
}

/** Get space biology facts filtered by topic */
export function getBiologyByTopic(topic: BiologyTopic): SpaceBiologyFact[] {
  return spaceBiology.filter((b) => b.topic === topic);
}

/** Get NASA facts filtered by category */
export function getFactsByCategory(category: FactCategory): NASAFact[] {
  return nasaFacts.filter((f) => f.category === category);
}

/** Get a random NASA fact, optionally filtered by minimum fun rating */
export function getRandomFact(minFunRating = 1): NASAFact {
  const filtered = nasaFacts.filter((f) => f.funRating >= minFunRating);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get all unique biology topics present in the data */
export function getAvailableBiologyTopics(): BiologyTopic[] {
  return [...new Set(spaceBiology.map((b) => b.topic))];
}

/** Get all unique fact categories present in the data */
export function getAvailableFactCategories(): FactCategory[] {
  return [...new Set(nasaFacts.map((f) => f.category))];
}
