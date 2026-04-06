// frontend/app/api/ads/route.js
// Next.js 15 App Router -- proxies to Express backend
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function GET(request) {
  try {
    var url = new URL(request.url);
    var qs = url.searchParams.toString();
    var backendUrl = BACKEND + '/api/ads' + (qs ? '?' + qs : '');
    var headers = {};
    var auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;
    var res = await fetch(backendUrl, { headers: headers, cache: 'no-store' });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable', details: e.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    var contentType = request.headers.get('content-type') || '';
    var auth = request.headers.get('authorization') || '';
    var headers = {};
    if (auth) headers['Authorization'] = auth;
    var body;
    if (contentType.includes('multipart/form-data')) {
      body = await request.formData();
    } else {
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    }
    var res = await fetch(BACKEND + '/api/ads', {
      method: 'POST',
      headers: headers,
      body: body,
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable', details: e.message }, { status: 503 });
  }
}
