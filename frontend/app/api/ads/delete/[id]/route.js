// frontend/app/api/ads/delete/[id]/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

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
    return Response.json({ error: 'Failed to delete ad', details: e.message }, { status: 503 });
  }
}

// Also support POST for forms that cannot send DELETE
export async function POST(request, context) {
  return DELETE(request, context);
}
