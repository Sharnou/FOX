// frontend/app/api/ads/[id]/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export async function GET(request, context) {
  try {
    var params = await context.params;
    var id = params.id;
    var auth = request.headers.get('authorization') || '';
    var headers = {};
    if (auth) headers['Authorization'] = auth;
    var res = await fetch(BACKEND + '/api/ads/' + id, { headers: headers, cache: 'no-store' });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

export async function PUT(request, context) {
  try {
    var params = await context.params;
    var id = params.id;
    var auth = request.headers.get('authorization') || '';
    var body = await request.text();
    var res = await fetch(BACKEND + '/api/ads/' + id, {
      method: 'PUT',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: body,
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

export async function DELETE(request, context) {
  try {
    var params = await context.params;
    var id = params.id;
    var auth = request.headers.get('authorization') || '';
    var res = await fetch(BACKEND + '/api/ads/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': auth },
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
