import { NextRequest, NextResponse } from 'next/server';
import { generateForgeBrief } from '../../../src/lib/analyzer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || 'Untitled Contract');
  const source = String(body.source || '');
  return NextResponse.json({
    ok: true,
    title,
    ...generateForgeBrief(source, title).analysis,
    secretExposure: 'No secrets are returned.',
  });
}
