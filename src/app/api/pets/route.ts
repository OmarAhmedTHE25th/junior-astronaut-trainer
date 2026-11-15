import { NextResponse } from 'next/server';
import { getPlayerPets, equipPet, getPlayerBoosts } from '@/lib/battleRoyale';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    const pets = await getPlayerPets(playerId);
    const boosts = await getPlayerBoosts(playerId);

    return NextResponse.json({ success: true, pets, boosts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, action, petId } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    if (action === 'EQUIP' && petId) {
      await equipPet(playerId, petId);
      const pets = await getPlayerPets(playerId);
      return NextResponse.json({ success: true, pets, equippedPetId: petId });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pet action failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
