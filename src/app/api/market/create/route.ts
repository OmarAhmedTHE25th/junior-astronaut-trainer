import { NextResponse } from 'next/server';
import { createListing } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellerId, sellerName, sellerAvatar, itemSlug, quantity, unitPrice, durationHours } = body;

    if (!sellerId || !itemSlug || !quantity || !unitPrice) {
      return NextResponse.json(
        { success: false, error: 'sellerId, itemSlug, quantity, and unitPrice are required' },
        { status: 400 }
      );
    }

    const listing = await createListing({
      sellerId,
      sellerName: sellerName || 'Martian Trader',
      sellerAvatar: sellerAvatar || '👨‍🚀',
      itemSlug,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      durationHours: durationHours ? Number(durationHours) : 48,
    });

    return NextResponse.json({ success: true, listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create market listing';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
