// frontend/app/api/auth/google/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// POST: Exchange Google credential (id_token) for app JWT
export async function POST(request) {
  try {
    var body = await request.json();
    var credential = body.credential || body.token || '';
    if (!credential) {
      return Response.json({ error: 'No credential provided' }, { status: 400 });
    }
    // Forward to Express backend Google auth route
    var res = await fetch(BACKEND + '/api/users/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: credential }),
    });
    var data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: 'Google auth failed', details: e.message }, { status: 503 });
  }
}

// GET: Handle OAuth redirect callback
export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get('code');
  var error = url.searchParams.get('error');
  if (error) {
    return Response.redirect(new URL('/login?error=google_denied', url.origin));
  }
  if (!code) {
    return Response.redirect(new URL('/login?error=no_code', url.origin));
  }
  // Forward code to backend
  try {
    var res = await fetch(BACKEND + '/api/users/google/callback?code=' + code, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    var data = await res.json();
    if (data.token) {
      // Redirect to frontend with token in URL (client will store in localStorage)
      return Response.redirect(new URL('/login?token=' + data.token + '&success=1', url.origin));
    }
    return Response.redirect(new URL('/login?error=auth_failed', url.origin));
  } catch (e) {
    return Response.redirect(new URL('/login?error=server_error', url.origin));
  }
}
