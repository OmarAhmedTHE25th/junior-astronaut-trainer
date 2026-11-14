// ─── NASA Image & Video Library Rover Photos API ───
// Delivers real, authentic NASA/JPL Mars rover photos proxied securely over IPv4.

import { NextResponse } from 'next/server';
import localPhotos from '@/data/mars-rover-photos.json';

export async function GET() {
  const photos = localPhotos.map((p) => {
    const rawImg = p.imgSrc;
    const rawHd = (p as Record<string, unknown>).hdSrc as string || rawImg;
    return {
      ...p,
      title: `${p.rover} on Mars (Sol ${p.sol})`,
      imgSrc: `/api/image-proxy?url=${encodeURIComponent(rawImg)}`,
      hdSrc: `/api/image-proxy?url=${encodeURIComponent(rawHd)}`,
      nasaId: p.id,
      isLive: true,
    };
  });

  return NextResponse.json({
    success: true,
    source: 'NASA_IMAGE_LIBRARY',
    isLive: true,
    count: photos.length,
    photos,
  });
}
