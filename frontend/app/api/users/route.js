// frontend/app/api/users/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function GET(request) {
  try {
    var auth = request.headers.get('authorization') || '';
    var res = await fetch(BACKEND + '/api/users/me', {
      headers: { 'Authorization': auth },
      cache: 'no-store',
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
