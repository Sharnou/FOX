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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
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
            var deferredPrompt;
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
              deferredPrompt = e;
              setTimeout(function() {
                if (document.getElementById('install-banner')) return;
                var banner = document.createElement('div');
                banner.id = 'install-banner';
                banner.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#002f34;color:white;padding:14px 20px;border-radius:16px;z-index:9999;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:340px;width:90%;font-family:system-ui';
                banner.innerHTML = '<span style="font-size:24px">📱</span><div style="flex:1"><p style="margin:0;font-weight:bold;font-size:14px">ثبّت XTOX على هاتفك</p><p style="margin:2px 0 0;opacity:0.8;font-size:12px">وصول سريع + إشعارات</p></div><button onclick="if(deferredPrompt){deferredPrompt.prompt();}document.getElementById(\'install-banner\').remove();" style="background:#00b09b;border:none;color:white;padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:bold;font-size:13px">ثبّت</button><button onclick="document.getElementById(\'install-banner\').remove();" style="background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:20px;padding:0 4px">×</button>';
                document.body.appendChild(banner);
              }, 30000);
            });
          })();
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Cairo', 'Tajawal', 'system-ui', sans-serif", background: '#f5f5f5', WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </body>
    </html>
  );
}
