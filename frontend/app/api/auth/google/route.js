// frontend/app/api/auth/google/route.js
export const dynamic = 'force-dynamic';

var BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// POST: Exchange Google credential (id_token) for app JWT
// Fix: was forwarding to /api/users/google (non-existent); correct path is /api/auth/google
export async function POST(request) {
  try {
    var body = await request.json();
    var credential = body.credential || body.token || '';
    if (!credential) {
      return Response.json({ error: 'No credential provided' }, { status: 400 });
    }
    // Forward to Express backend Google auth route (fixed path)
    var res = await fetch(BACKEND + '/api/auth/google', {
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

// GET: Handle OAuth redirect callback from Google
// Fix: was trying to call /api/users/google/callback (non-existent);
// correct approach is to forward the browser to the backend callback handler
// which performs the token exchange and issues a JWT, then redirects back to /login?session=...
export async function GET(request) {
  var url = new URL(request.url);
  var code = url.searchParams.get('code');
  var state = url.searchParams.get('state');
  var error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(new URL('/login?error=google_denied', url.origin));
  }
  if (!code) {
    return Response.redirect(new URL('/login?error=no_code', url.origin));
  }

  // Redirect to the backend's OAuth callback handler.
  // The backend will exchange the code for tokens, create/update the user,
  // and redirect to /login?session=<base64url-encoded-session>
  var backendCallback = BACKEND + '/api/auth/google/callback?code=' + encodeURIComponent(code);
  if (state) backendCallback += '&state=' + encodeURIComponent(state);

  return Response.redirect(backendCallback, 302);
}
