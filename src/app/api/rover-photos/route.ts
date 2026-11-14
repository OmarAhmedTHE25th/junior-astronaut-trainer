// ─── NASA Image & Video Library Rover Photos API ───
// Fetches real NASA/JPL Mars rover photos from https://images-api.nasa.gov/search
// Falls back to local curated data if the API is unreachable.

import { NextResponse } from 'next/server';
import localPhotos from '@/data/mars-rover-photos.json';

interface NasaImageItem {
  data?: Array<{
    nasa_id?: string;
    title?: string;
    description?: string;
    date_created?: string;
    center?: string;
    keywords?: string[];
  }>;
  links?: Array<{
    href?: string;
    rel?: string;
    render?: string;
  }>;
}

interface NasaApiResponse {
  collection?: {
    items?: NasaImageItem[];
  };
}

// Multiple focused queries to get good coverage of all rovers
const QUERIES = [
  'Mars+Curiosity+rover+surface+Gale',
  'Mars+Perseverance+rover+Jezero',
  'Mars+Opportunity+rover+crater',
  'Mars+Spirit+rover+Gusev',
];

function detectRover(title: string, desc: string, keywords: string[]): string {
  const all = `${title} ${desc} ${keywords.join(' ')}`.toLowerCase();
  if (all.includes('perseverance') || all.includes('mars 2020') || all.includes('jezero')) return 'Perseverance';
  if (all.includes('opportunity') || all.includes('mer-b') || all.includes('mer b')) return 'Opportunity';
  if (all.includes('spirit') || all.includes('mer-a') || all.includes('mer a') || all.includes('gusev')) return 'Spirit';
  return 'Curiosity';
}

function detectCamera(title: string, desc: string): string {
  const all = `${title} ${desc}`.toLowerCase();
  if (all.includes('mastcam-z') || all.includes('zcam')) return 'MASTCAM-Z';
  if (all.includes('mastcam') || all.includes('mast cam')) return 'MAST';
  if (all.includes('navcam') || all.includes('navigation camera')) return 'NAVCAM';
  if (all.includes('hazcam') || all.includes('hazard')) return 'HAZCAM';
  if (all.includes('mahli') || all.includes('hand lens')) return 'MAHLI';
  if (all.includes('chemcam')) return 'CHEMCAM';
  if (all.includes('supercam')) return 'SUPERCAM';
  if (all.includes('sherloc')) return 'SHERLOC';
  if (all.includes('pancam') || all.includes('panoramic')) return 'PANCAM';
  return 'CAMERA';
}

export async function GET() {
  try {
    // Fetch from the first query that succeeds — pick one broad query
    const queryStr = 'Mars+rover+surface+JPL';
    const url = `https://images-api.nasa.gov/search?q=${queryStr}&media_type=image&center=JPL&page_size=20`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`NASA API returned ${res.status}`);
    }

    const json = (await res.json()) as NasaApiResponse;
    const items = json.collection?.items ?? [];

    if (items.length === 0) {
      throw new Error('NASA API returned empty results');
    }

    const photos = items
      .filter((item) => {
        // Must have at least a preview link and data
        const hasLink = item.links?.some((l) => l.rel === 'preview' && l.href);
        const hasData = item.data && item.data.length > 0 && item.data[0].title;
        return hasLink && hasData;
      })
      .slice(0, 17)
      .map((item, idx) => {
        const d = item.data![0];
        const previewLink = item.links!.find((l) => l.rel === 'preview');
        const imgSrc = previewLink?.href ?? '';
        const title = d.title ?? 'Mars Rover Photo';
        const description = d.description ?? title;
        const rover = detectRover(title, description, d.keywords ?? []);
        const camera = detectCamera(title, description);

        return {
          id: `nasa-img-${d.nasa_id ?? idx}`,
          rover,
          sol: 0,
          camera,
          earthDate: d.date_created?.slice(0, 10) ?? 'Unknown',
          imgSrc,
          // Use NASA Image Library full-res URL pattern
          hdSrc: imgSrc.replace('~thumb.jpg', '~orig.jpg'),
          title,
          description: description.length > 300 ? description.slice(0, 297) + '...' : description,
          nasaId: d.nasa_id ?? '',
          isLive: true,
        };
      });

    if (photos.length === 0) {
      throw new Error('No valid photos after filtering');
    }

    return NextResponse.json({
      success: true,
      source: 'NASA_IMAGE_LIBRARY',
      isLive: true,
      count: photos.length,
      photos,
    });
  } catch (err) {
    console.warn('NASA Image Library fetch error, using local cache:', err);

    // Return local curated data with isLive: false
    const photos = localPhotos.map((p) => ({
      ...p,
      title: `${p.rover} on Mars`,
      hdSrc: p.imgSrc,
      nasaId: p.id,
      isLive: false,
    }));

    return NextResponse.json({
      success: true,
      source: 'LOCAL_CACHE',
      isLive: false,
      count: photos.length,
      photos,
    });
  }
}
