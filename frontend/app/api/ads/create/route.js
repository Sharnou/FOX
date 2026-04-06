// frontend/app/api/ads/create/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function POST(request) {
  try {
    var auth = request.headers.get('authorization') || '';
    var contentType = request.headers.get('content-type') || '';
    var headers = {};
    if (auth) headers['Authorization'] = auth;
    var body;
    if (contentType.includes('multipart')) {
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
    return Response.json({ error: 'Failed to create ad', details: e.message }, { status: 503 });
  }
}
