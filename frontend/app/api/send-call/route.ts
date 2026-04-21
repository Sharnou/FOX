import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const { to, data } = await req.json();
    // Forward to Railway backend which has firebase-admin
    const res = await fetch(
      BACKEND + '/api/calls/push',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: to, data }),
      }
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Backend unavailable', details: message }, { status: 503 });
  }
}
