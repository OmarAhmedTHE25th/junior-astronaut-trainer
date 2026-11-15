import { NextResponse } from 'next/server';
import { cancelListing } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellerId, listingId } = body;

    if (!sellerId || !listingId) {
      return NextResponse.json(
        { success: false, error: 'sellerId and listingId are required' },
        { status: 400 }
      );
    }

    const result = await cancelListing({
      sellerId,
      listingId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cancel listing failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
