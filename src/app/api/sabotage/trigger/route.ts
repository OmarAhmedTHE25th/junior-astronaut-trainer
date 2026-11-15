import { NextResponse } from 'next/server';
import { triggerSabotage } from '@/lib/sabotageEngine';
import type { TriggerSabotageRequest } from '@/lib/sabotageTypes';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TriggerSabotageRequest;

    if (!body.attackerId || !body.targetId || !body.sabotageSlug || !body.contextType || !body.contextId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters (attackerId, targetId, sabotageSlug, contextType, contextId)',
        },
        { status: 400 }
      );
    }

    const result = await triggerSabotage(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to trigger sabotage operation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
