import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';
    const res = await fetch(`${backendUrl}/api/ads/price-suggest?${query}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json(null, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('[price-suggest proxy]', e.message);
    return NextResponse.json(null, { status: 500 });
  }
}
