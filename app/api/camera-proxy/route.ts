import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      'user-agent': 'GenLayer Contract Forge camera proxy',
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store, max-age=0',
    },
  });
}
