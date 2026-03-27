import './globals.css';

export const metadata = {
  title: 'XTOX',
  description: 'XTOX Marketplace',
  manifest: '/manifest.webmanifest'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var API = '` + (process.env.NEXT_PUBLIC_API_URL || '') + `';
            function reportError(message, source, severity) {
              try {
                var user = JSON.parse(localStorage.getItem('user') || '{}');
                fetch(API + '/api/errors/report', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    page: window.location.pathname,
                    message: message,
                    url: window.location.href,
                    userId: user.id || 'anonymous',
                    country: user.country || localStorage.getItem('country') || 'unknown',
                    userAgent: navigator.userAgent,
                    severity: severity || 'medium',
                    stack: source || ''
                  })
                }).catch(function(){});
              } catch(e) {}
            }
            window.onerror = function(msg, src, line, col, err) {
              reportError(msg + ' at ' + src + ':' + line, err ? err.stack : src, 'high');
              return false;
            };
            window.onunhandledrejection = function(e) {
              reportError('Unhandled Promise: ' + (e.reason && e.reason.message || String(e.reason)), e.reason && e.reason.stack, 'medium');
            };
            console.log('[XTOX] Error tracking active');
          })();
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
