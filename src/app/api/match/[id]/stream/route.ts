import { NextRequest, NextResponse } from 'next/server';
import { getMatchState } from '@/lib/matchmakingEngine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing match ID.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const isPoll = searchParams.get('poll') === 'true';

    // If client requested a quick snapshot/poll
    if (isPoll) {
      const match = await getMatchState(id);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Match not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, match });
    }

    // Server-Sent Events (SSE) streaming
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial match snapshot immediately
        const initialMatch = await getMatchState(id);
        if (initialMatch) {
          controller.enqueue(
            encoder.encode(`event: match_state\ndata: ${JSON.stringify(initialMatch)}\n\n`)
          );
        } else {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Match not found' })}\n\n`)
          );
          controller.close();
          return;
        }

        // Heartbeat & state polling loop (active for serverless lifetime)
        const interval = setInterval(async () => {
          if (isClosed) {
            clearInterval(interval);
            return;
          }

          try {
            const currentMatch = await getMatchState(id);
            if (currentMatch) {
              controller.enqueue(
                encoder.encode(`event: match_state\ndata: ${JSON.stringify(currentMatch)}\n\n`)
              );
            }
            // Comment ping to keep connection alive through proxies
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(interval);
            if (!isClosed) {
              try {
                controller.close();
              } catch {}
            }
          }
        }, 1200);

        req.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/match/[id]/stream error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Match stream failed.' },
      { status: 500 }
    );
  }
}
