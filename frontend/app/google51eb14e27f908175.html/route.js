export async function GET() {
  return new Response('google-site-verification: google51eb14e27f908175.html\n', {
    headers: { 'Content-Type': 'text/html' },
  });
}
