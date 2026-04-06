// frontend/app/api/notifications/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function GET(request) {
  try {
    var auth = request.headers.get('authorization') || '';
    var res = await fetch(BACKEND + '/api/notifications', {
      headers: { 'Authorization': auth },
      cache: 'no-store',
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    var url = new URL(request.url);
    var auth = request.headers.get('authorization') || '';
    var path = url.pathname.replace('/api/notifications', '');
    var res = await fetch(BACKEND + '/api/notifications' + path, {
      method: 'POST',
      headers: { 'Authorization': auth },
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ success: true }, { status: 200 });
  }
}
