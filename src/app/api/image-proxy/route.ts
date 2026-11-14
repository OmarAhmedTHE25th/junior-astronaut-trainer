import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const allowed = ['images-assets.nasa.gov', 'images-api.nasa.gov', 'mars.nasa.gov', 'upload.wikimedia.org'];
    if (!allowed.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return new NextResponse('Unauthorized host', { status: 403 });
    }

    // Fetch via IPv4 to bypass Windows IPv6 routing drops on government CDN hosts
    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
      const fetchUrl = (targetUrl: string, redirectsRemaining = 3) => {
        const request = https.get(targetUrl, { family: 4, timeout: 8000 }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirectsRemaining <= 0) {
              reject(new Error('Too many redirects'));
              return;
            }
            fetchUrl(res.headers.location, redirectsRemaining - 1);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Upstream returned ${res.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        });

        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Request timed out'));
        });
      };

      fetchUrl(url);
    });

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Image proxy error:', err.message);
    return new NextResponse(`Failed to fetch image: ${err.message}`, { status: 502 });
  }
}
