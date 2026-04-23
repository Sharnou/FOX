#!/usr/bin/env node
/**
 * Cross-platform Capacitor export build script.
 * Temporarily removes server-only App Router routes before next build,
 * then restores them. Works on Windows, macOS, and Linux.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const tmpDir = path.join(require('os').tmpdir(), 'cap-routes-backup-' + Date.now());

// Routes that use force-dynamic / server-only features
const SERVER_ROUTES = ['api', 'robots.txt', 'sitemap-index.xml', 'sitemap.xml'];

console.log('[cap-build] Backing up server-only routes to', tmpDir);
fs.mkdirSync(tmpDir, { recursive: true });

// Move server routes out
for (const route of SERVER_ROUTES) {
  const src = path.join(appDir, route);
  const dst = path.join(tmpDir, route);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dst);
    console.log('[cap-build] Moved:', route);
  }
}

let buildFailed = false;
try {
  console.log('[cap-build] Running next build (output: export)...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'capacitor' }
  });
} catch (err) {
  buildFailed = true;
  console.error('[cap-build] Build failed:', err.message);
} finally {
  // Always restore routes
  console.log('[cap-build] Restoring server-only routes...');
  for (const route of SERVER_ROUTES) {
    const src = path.join(tmpDir, route);
    const dst = path.join(appDir, route);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dst);
      console.log('[cap-build] Restored:', route);
    }
  }
}

if (buildFailed) process.exit(1);
console.log('[cap-build] Done!');
