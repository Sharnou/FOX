import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { to, data } = await req.json();
  // Forward to Railway backend which has firebase-admin
  const res = await fetch(
    process.env.NEXT_PUBLIC_API_URL + '/api/calls/push',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: to, data }),
    }
  );
  const json = await res.json();
  return NextResponse.json(json);
}
