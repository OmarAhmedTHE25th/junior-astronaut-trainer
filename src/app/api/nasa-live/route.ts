// ─── Live NASA Space Weather Telemetry Sync API ───
// Fetches real DONKI Solar Flares and CMEs with 15-min ISR caching & local cache failover.

import { NextResponse } from 'next/server';
import type { LiveSpaceWeatherEvent } from '@/lib/types';
import localDonkiEvents from '@/data/donki-events.json';

interface NasaFlrRaw {
  flrID?: string;
  instruments?: Array<{ displayName?: string }>;
  beginTime?: string;
  peakTime?: string;
  endTime?: string;
  classType?: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  link?: string;
}

interface NasaCmeRaw {
  activityID?: string;
  startTime?: string;
  sourceLocation?: string;
  note?: string;
  link?: string;
  cmeAnalyses?: Array<{
    type?: string;
    speed?: number;
    halfAngle?: number;
  }>;
}

function parseIntensityFromClass(classType?: string): number {
  if (!classType) return 5;
  const upper = classType.toUpperCase();
  if (upper.startsWith('X')) {
    const val = parseFloat(upper.replace('X', '')) || 1;
    return Math.min(10, 8 + Math.floor(val / 3));
  }
  if (upper.startsWith('M')) {
    const val = parseFloat(upper.replace('M', '')) || 1;
    return Math.min(8, 4 + Math.floor(val / 2.5));
  }
  if (upper.startsWith('C')) return 3;
  if (upper.startsWith('B')) return 2;
  return 1;
}

function estimateRadiationImpact(type: 'FLARE' | 'CME', classType: string, intensity: number): string {
  if (type === 'FLARE') {
    if (intensity >= 8) return 'CRITICAL: High Proton Flux • Mars Surface Radiation Spike (>50 mSv/day)';
    if (intensity >= 5) return 'MODERATE: Ionizing X-Ray Flux • Radio Blackout on Mars Orbiters';
    return 'LOW: Background Solar Wind Perturbation (<5 mSv/day)';
  } else {
    if (intensity >= 8) return 'SEVERE: Coronal Plasma Wave • Magnetosphere Compression • Storm Cellar Alert';
    if (intensity >= 5) return 'ELEVATED: Fast Solar Wind Stream (600+ km/s) • Secondary Auroral Activity';
    return 'NOMINAL: Slow Solar Ejecta • Minor Geomagnetic Perturbation';
  }
}

function getLocalFailoverEvents(): LiveSpaceWeatherEvent[] {
  return localDonkiEvents.slice(0, 8).map((evt) => {
    const isFlare = evt.eventType.toLowerCase().includes('flare');
    const type: 'FLARE' | 'CME' = isFlare ? 'FLARE' : 'CME';
    return {
      id: evt.id,
      type,
      classType: evt.classType || (isFlare ? 'M5.0' : 'Fast CME'),
      peakTime: evt.date,
      sourceLocation: 'Sun Active Region (Solar Disc)',
      intensity: evt.intensity,
      summary: evt.description,
      link: evt.sourceUrl || 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      isLive: false,
      radiationImpact: estimateRadiationImpact(type, evt.classType || 'M5.0', evt.intensity),
    };
  });
}

export async function GET() {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

  try {
    const flrUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${sevenDaysAgo}&endDate=${today}&api_key=${apiKey}`;
    const cmeUrl = `https://api.nasa.gov/DONKI/CME?startDate=${sevenDaysAgo}&endDate=${today}&api_key=${apiKey}`;

    const [flrRes, cmeRes] = await Promise.all([
      fetch(flrUrl, { signal: AbortSignal.timeout(3500), next: { revalidate: 900 } }),
      fetch(cmeUrl, { signal: AbortSignal.timeout(3500), next: { revalidate: 900 } }),
    ]);

    const liveEvents: LiveSpaceWeatherEvent[] = [];

    if (flrRes.ok) {
      const flrData = (await flrRes.json()) as NasaFlrRaw[];
      if (Array.isArray(flrData)) {
        for (const flr of flrData.slice(-5).reverse()) {
          const classType = flr.classType || 'C-class';
          const intensity = parseIntensityFromClass(classType);
          liveEvents.push({
            id: flr.flrID || `FLR-${flr.peakTime || Date.now()}`,
            type: 'FLARE',
            classType,
            peakTime: flr.peakTime || flr.beginTime || new Date().toISOString(),
            sourceLocation: flr.sourceLocation ? `Region ${flr.sourceLocation}` : (flr.activeRegionNum ? `Region AR${flr.activeRegionNum}` : 'Sun Surface'),
            intensity,
            summary: `Solar flare peak detected in ${flr.sourceLocation || 'active region'} classified at ${classType}.`,
            link: flr.link || 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
            isLive: true,
            radiationImpact: estimateRadiationImpact('FLARE', classType, intensity),
          });
        }
      }
    }

    if (cmeRes.ok) {
      const cmeData = (await cmeRes.json()) as NasaCmeRaw[];
      if (Array.isArray(cmeData)) {
        for (const cme of cmeData.slice(-4).reverse()) {
          const speed = cme.cmeAnalyses?.[0]?.speed;
          const cmeType = cme.cmeAnalyses?.[0]?.type || 'Halo CME';
          const intensity = speed && speed > 1000 ? 9 : speed && speed > 600 ? 6 : 4;
          liveEvents.push({
            id: cme.activityID || `CME-${cme.startTime || Date.now()}`,
            type: 'CME',
            classType: speed ? `${Math.round(speed)} km/s CME` : cmeType,
            peakTime: cme.startTime || new Date().toISOString(),
            sourceLocation: cme.sourceLocation || 'Solar Corona',
            intensity,
            summary: cme.note || `Coronal Mass Ejection detected propagating across interplanetary space.`,
            link: cme.link || 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
            isLive: true,
            radiationImpact: estimateRadiationImpact('CME', cmeType, intensity),
          });
        }
      }
    }

    if (liveEvents.length > 0) {
      // Sort newest peakTime first and take up to 8
      liveEvents.sort((a, b) => new Date(b.peakTime).getTime() - new Date(a.peakTime).getTime());
      return NextResponse.json({
        success: true,
        source: 'LIVE_NASA_DONKI',
        isLive: true,
        count: liveEvents.length,
        events: liveEvents.slice(0, 8),
        fetchedAt: new Date().toISOString(),
      });
    }

    // If NASA returned empty lists, fallback cleanly
    return NextResponse.json({
      success: true,
      source: 'LOCAL_CACHE_FAILOVER',
      isLive: false,
      count: 8,
      events: getLocalFailoverEvents(),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('NASA live telemetry fetch error, switching to offline cache:', err);
    return NextResponse.json({
      success: true,
      source: 'LOCAL_CACHE_FAILOVER',
      isLive: false,
      count: 8,
      events: getLocalFailoverEvents(),
      fetchedAt: new Date().toISOString(),
    });
  }
}
