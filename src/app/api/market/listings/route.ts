import { NextResponse } from 'next/server';
import { getMarketListings, getMarketScarcityTrends } from '@/lib/marketplace';
import type { ItemCategory } from '@/lib/marketplaceTypes';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ItemCategory | null;
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status') || 'active';

    const listings = await getMarketListings({
      category: category || undefined,
      sellerId: sellerId || undefined,
      status,
    });

    const trends = getMarketScarcityTrends();

    return NextResponse.json({
      success: true,
      listings,
      trends,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch market listings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
