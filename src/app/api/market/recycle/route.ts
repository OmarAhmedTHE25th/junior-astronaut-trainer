import { NextResponse } from 'next/server';
import { executeRecycleItem } from '@/lib/marketplace';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, itemSlug, quantity } = body;

    if (!playerId || !itemSlug || !quantity) {
      return NextResponse.json(
        { success: false, error: 'playerId, itemSlug, and quantity are required' },
        { status: 400 }
      );
    }

    const result = await executeRecycleItem({
      playerId,
      itemSlug,
      quantity: Number(quantity),
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recycle failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
