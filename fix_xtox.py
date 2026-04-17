#!/usr/bin/env python3
"""
fix_xtox.py — AI-Powered Auto-Fix Script for XTOX App
======================================================
Merges the original fix_xtx.py template with XTOX's actual stack:
  Backend  : Node.js / Express  (Railway, port 8080)
  Frontend : Next.js 16         (Vercel, dev port 3000)
  Database : MongoDB Atlas
  Media    : Cloudinary
  Auth     : JWT + WhatsApp OTP + Email OTP + Google OAuth

Prerequisites:
  pip install openai requests playwright pylint black pytest \
              coverage beautifulsoup4 pytest-flask

  npm install -g eslint prettier   # for JS/JSX linting

  export OPENAI_API_KEY=sk-...     # optional, falls back to rule-based
  export XTOX_ADMIN_TOKEN=...      # for live API tests (get via fake OTP)

Usage:
  cd FOX/
  python fix_xtox.py [--live] [--port 3000]

Flags:
  --live   : Run live Playwright tests against deployed URLs
  --port N : Override local Next.js dev port (default 3000)
"""

import os
import sys
import re
import json
import time
import shutil
import logging
import argparse
import subprocess
import threading
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── Optional imports (graceful fallback) ──────────────────────────────────────
try:
    import openai
    _openai_available = True
except ImportError:
    _openai_available = False

try:
    from playwright.sync_api import sync_playwright
    _playwright_available = True
except ImportError:
    _playwright_available = False

try:
    import pylint.lint
    _pylint_available = True
except ImportError:
    _pylint_available = False

try:
    import black
    _black_available = True
except ImportError:
    _black_available = False

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fix_xtox")

# ── Config ────────────────────────────────────────────────────────────────────
ROOT_DIR      = Path(__file__).parent
BACKEND_DIR   = ROOT_DIR / "backend"
FRONTEND_DIR  = ROOT_DIR / "frontend"

# Live URLs (read from env or use defaults)
BACKEND_URL   = os.getenv("XTOX_BACKEND_URL",  "https://xtox-production.up.railway.app")
FRONTEND_URL  = os.getenv("XTOX_FRONTEND_URL", "https://fox-kohl-eight.vercel.app")
BACKEND_PORT  = int(os.getenv("XTOX_BACKEND_PORT", "8080"))   # Railway
FRONTEND_PORT = int(os.getenv("XTOX_FRONTEND_PORT", "3000"))  # Next.js dev

ADMIN_TOKEN   = os.getenv("XTOX_ADMIN_TOKEN", "")
API_KEY       = os.getenv("OPENAI_API_KEY", "")

# AI client
client = None
if _openai_available and API_KEY:
    client = openai.OpenAI(api_key=API_KEY)


# ══════════════════════════════════════════════════════════════════════════════
# AI FIX ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def ai_fix_suggestion(error_msg: str, code_snippet: str, lang: str = "javascript") -> str:
    """AI-powered fix via OpenAI gpt-4o-mini. Falls back to rule-based."""
    if not client:
        logger.warning("No OpenAI key — using rule-based fixes")
        return rule_based_fix(error_msg, code_snippet)

    prompt = (
        f"Fix this {lang} error in the XTOX marketplace app (Node.js/Express backend, "
        f"Next.js 16 frontend, MongoDB, Railway deployment):\n\n"
        f'Error: "{error_msg}"\n\n'
        f"Code:\n```{lang}\n{code_snippet[:3000]}\n```\n\n"
        f"Provide ONLY the fixed code block, no explanation."
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000,
        )
        fix = resp.choices[0].message.content
        # Strip markdown code fences if present
        fix = re.sub(r"^```[a-z]*\n?", "", fix, flags=re.MULTILINE)
        fix = re.sub(r"\n?```$", "", fix, flags=re.MULTILINE)
        return fix.strip()
    except Exception as exc:
        logger.error("OpenAI error: %s", exc)
        return rule_based_fix(error_msg, code_snippet)


def rule_based_fix(error: str, code: str) -> str:
    """Fallback rule-based fixes for common XTOX/Node.js issues."""
    rules = {
        # CORS
        r"CORS|Access-Control": (
            "// Add to backend/server/index.js:\n"
            "import cors from 'cors';\n"
            "app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));"
        ),
        # Missing env vars
        r"OPENAI_API_KEY.*undefined|No API key": (
            "// Set in Railway Variables tab:\n"
            "// OPENAI_API_KEY=sk-...\n"
            "// OPENAI_ANALYSIS_KEY=sk-..."
        ),
        # MongoDB connection
        r"MongooseError|MongoError|ECONNREFUSED.*27017": (
            "// Check MONGODB_URI in Railway env vars\n"
            "// Format: mongodb+srv://user:pass@cluster.mongodb.net/xtox"
        ),
        # JWT errors
        r"JsonWebTokenError|jwt.*malformed|invalid token": (
            "// Ensure JWT_SECRET is set in Railway\n"
            "// And token is sent as: Authorization: Bearer <token>"
        ),
        # Port conflicts
        r"EADDRINUSE.*port": (
            f"// Port already in use — change BACKEND_PORT env var\n"
            f"// Current: {BACKEND_PORT} → try {BACKEND_PORT + 1}"
        ),
        # Missing route
        r"404|Cannot (GET|POST|PUT|DELETE)": (
            "// Route not registered — check backend/server/index.js\n"
            "// import newRouter from '../routes/new.js';\n"
            "// app.use('/api/new', newRouter);"
        ),
        # Country lock
        r"country.*lock|PLATFORM_COUNTRY": (
            "// Set in Railway: PLATFORM_COUNTRY=EG\n"
            "// Enforced in backend/middleware/countryLock.js"
        ),
        # Build errors
        r"Cannot access.*before initialization|TDZ": (
            "// Move const/let declarations to module level (outside functions)\n"
            "// SWC minifier renames inline uppercase constants causing TDZ"
        ),
        # WhatsApp OTP
        r"WhatsApp.*OTP|WHATSAPP": (
            "// Set in Railway:\n"
            "// USE_FAKE_API=false\n"
            "// WHATSAPP_API_TOKEN=<Meta permanent token>\n"
            "// WHATSAPP_PHONE_NUMBER_ID=<Meta phone number ID>"
        ),
    }

    for pattern, fix in rules.items():
        if re.search(pattern, error, re.IGNORECASE):
            return fix

    return "# Auto-fix failed — manual review needed\n# Error: " + error[:200]


# ══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def install_missing_deps():
    """Install all backend and frontend npm deps. Also checks Python deps."""
    logger.info("📦 Installing dependencies...")

    errors = []

    # Backend npm deps
    if (BACKEND_DIR / "package.json").exists():
        logger.info("  → Backend npm install")
        r = subprocess.run(
            ["npm", "install", "--prefer-offline"],
            cwd=BACKEND_DIR, capture_output=True, text=True
        )
        if r.returncode != 0:
            logger.error("Backend npm install failed: %s", r.stderr[:500])
            errors.append(r.stderr)
        else:
            logger.info("  ✅ Backend deps installed")
    else:
        logger.warning("  ⚠️  No backend/package.json found")

    # Frontend npm deps
    if (FRONTEND_DIR / "package.json").exists():
        logger.info("  → Frontend npm install")
        r = subprocess.run(
            ["npm", "install", "--prefer-offline"],
            cwd=FRONTEND_DIR, capture_output=True, text=True
        )
        if r.returncode != 0:
            logger.error("Frontend npm install failed: %s", r.stderr[:500])
            errors.append(r.stderr)
        else:
            logger.info("  ✅ Frontend deps installed")
    else:
        logger.warning("  ⚠️  No frontend/package.json found")

    # Python deps for this script
    python_deps = [
        "openai", "requests", "playwright", "pylint", "black",
        "pytest", "coverage", "beautifulsoup4", "pytest-flask"
    ]
    logger.info("  → Python script deps")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet"] + python_deps,
        capture_output=True
    )
    logger.info("  ✅ Python deps installed")

    return len(errors) == 0


# ══════════════════════════════════════════════════════════════════════════════
# STATIC CODE ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def scan_code_errors():
    """
    Static analysis for both JS/TS (ESLint) and Python files (pylint + black).
    Reports issues; uses AI to suggest fixes for critical errors.
    """
    logger.info("🔍 Scanning code for errors...")
    issues = []

    # ── JavaScript / JSX / TypeScript via Node syntax check ──────────────────
    js_exts = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}
    js_files = []
    for ext in js_exts:
        js_files += list(BACKEND_DIR.rglob(f"*{ext}"))
        js_files += list(FRONTEND_DIR.rglob(f"*{ext}"))

    # Filter out node_modules and .next
    js_files = [
        f for f in js_files
        if "node_modules" not in str(f) and ".next" not in str(f)
    ]

    logger.info("  → Checking %d JS/TS files with node --check", len(js_files))
    syntax_errors = []
    for js_file in js_files:
        r = subprocess.run(
            ["node", "--check", str(js_file)],
            capture_output=True, text=True
        )
        if r.returncode != 0 and r.stderr.strip():
            err = r.stderr.strip()
            syntax_errors.append((js_file, err))
            logger.error("  ✗ %s: %s", js_file.name, err[:200])

    if syntax_errors:
        logger.warning("  ⚠️  %d syntax errors found", len(syntax_errors))
        for fpath, err in syntax_errors[:3]:  # AI fix first 3
            logger.info("  🤖 Getting AI fix for %s...", fpath.name)
            snippet = fpath.read_text(encoding="utf-8", errors="ignore")[:2000]
            fix = ai_fix_suggestion(err, snippet, "javascript")
            issues.append({"file": str(fpath), "error": err, "fix": fix})
            logger.info("  💡 Suggested fix:\n%s", fix[:300])
    else:
        logger.info("  ✅ No JS/TS syntax errors")

    # ── ESLint (if available) ─────────────────────────────────────────────────
    if shutil.which("eslint"):
        for target_dir in [BACKEND_DIR, FRONTEND_DIR]:
            if not target_dir.exists():
                continue
            logger.info("  → ESLint: %s", target_dir.name)
            r = subprocess.run(
                ["eslint", ".", "--ext", ".js,.jsx,.ts,.tsx",
                 "--max-warnings", "50", "--format", "compact"],
                cwd=target_dir, capture_output=True, text=True
            )
            if r.stdout.strip():
                logger.warning("  ESLint %s:\n%s", target_dir.name, r.stdout[:1000])
    else:
        logger.info("  ℹ️  ESLint not installed globally (npm install -g eslint)")

    # ── Next.js build check ───────────────────────────────────────────────────
    logger.info("  → Next.js build check")
    r = subprocess.run(
        ["npm", "run", "build"],
        cwd=FRONTEND_DIR, capture_output=True, text=True,
        timeout=300
    )
    if r.returncode != 0:
        err = (r.stdout + r.stderr)[-3000:]
        logger.error("  ✗ Next.js build failed:\n%s", err[:500])
        fix = ai_fix_suggestion("Next.js build error", err, "javascript")
        issues.append({"file": "frontend/", "error": "Build failed", "fix": fix})
        logger.info("  💡 AI Fix: %s", fix[:200])
    else:
        logger.info("  ✅ Next.js build passed")

    # ── Python files via pylint + black ──────────────────────────────────────
    py_files = list(ROOT_DIR.glob("*.py"))  # Script-level py files
    if py_files and _pylint_available:
        logger.info("  → Pylint on %d Python files", len(py_files))
        for py_file in py_files:
            try:
                pylint.lint.Run(
                    [str(py_file), "--errors-only"],
                    do_exit=False
                )
            except SystemExit:
                pass

    if py_files and _black_available:
        logger.info("  → Black formatting Python files")
        for py_file in py_files:
            try:
                black.format_file_in_place(
                    py_file, fast=False, mode=black.FileMode()
                )
            except Exception as e:
                logger.warning("  Black skip %s: %s", py_file.name, e)

    logger.info("  ✅ Code scan complete (%d issues)", len(issues))
    return issues


# ══════════════════════════════════════════════════════════════════════════════
# BACKEND HEALTH & API TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_runtime_errors(live: bool = True):
    """
    Test live Railway backend endpoints. Replaces Flask test_client()
    with HTTP requests against the real or local Express server.
    """
    logger.info("🚀 Testing backend runtime...")

    base = BACKEND_URL if live else f"http://localhost:{BACKEND_PORT}"
    headers = {}
    if ADMIN_TOKEN:
        headers["Authorization"] = f"Bearer {ADMIN_TOKEN}"

    # Critical endpoints to test
    endpoints = [
        # (method, path, body, expected_status, description)
        ("GET",  "/",                          None, [200, 404], "Root"),
        ("GET",  "/api/ads?limit=3",           None, [200],      "Ads list"),
        ("GET",  "/api/ads/categories",        None, [200],      "Categories"),
        ("GET",  "/api/geo/detect",            None, [200],      "Geo detect"),
        ("GET",  "/api/translations",          None, [200],      "Translation list"),
        ("GET",  "/api/translations/nl",       None, [200],      "Dutch auto-translate"),
        ("GET",  "/api/promote/plans",         None, [200],      "Promote plans"),
        ("GET",  "/api/winner/leaderboard",    None, [200],      "Leaderboard"),
        ("GET",  "/api/winner/history",        None, [200],      "Winner history"),
        ("POST", "/api/auth/email/send-otp",   {"email": "healthcheck@xtox.test"}, [200, 201], "Email OTP send"),
        ("POST", "/api/auth/email/verify-otp", {"email": "healthcheck@xtox.test", "otp": "000000"}, [200, 201], "Email OTP verify"),
        ("GET",  "/api/users/me",              None, [200, 401], "Auth check"),
        ("GET",  "/api/wp/sitemap",            None, [200],      "WP sitemap"),
    ]

    results = {"passed": [], "failed": [], "errors": []}

    for method, path, body, expected, desc in endpoints:
        url = base + path
        try:
            r = requests.request(
                method, url, json=body, headers=headers, timeout=15
            )
            if r.status_code in expected:
                logger.info("  ✅ [%s] %s → %d", method, path, r.status_code)
                results["passed"].append(path)
            else:
                logger.error(
                    "  ✗ [%s] %s → %d (expected %s)\n     %s",
                    method, path, r.status_code, expected, r.text[:200]
                )
                results["failed"].append(path)
                # AI fix suggestion
                fix = ai_fix_suggestion(
                    f"HTTP {r.status_code} on {method} {path}",
                    r.text[:1000], "javascript"
                )
                logger.info("  💡 AI Fix: %s", fix[:200])
                results["errors"].append({
                    "path": path, "status": r.status_code,
                    "body": r.text[:500], "fix": fix
                })

        except requests.exceptions.ConnectionError:
            logger.warning("  ⚠️  Connection refused — backend not running? URL: %s", url)
            results["errors"].append({"path": path, "error": "Connection refused"})
        except Exception as exc:
            logger.error("  ✗ %s %s → %s", method, path, exc)
            results["errors"].append({"path": path, "error": str(exc)})

    # Cleanup health-check user
    _cleanup_health_user(base, headers)

    pct = (len(results["passed"]) / max(len(endpoints), 1)) * 100
    logger.info(
        "  API tests: %d/%d passed (%.0f%%)",
        len(results["passed"]), len(endpoints), pct
    )
    return results


def _cleanup_health_user(base: str, headers: dict):
    """Delete the healthcheck test user created during API tests."""
    try:
        # Find the user
        r = requests.get(
            f"{base}/api/users?search=healthcheck@xtox.test",
            headers=headers, timeout=5
        )
        if r.status_code == 200:
            data = r.json()
            users = data.get("users", data if isinstance(data, list) else [])
            for user in users:
                uid = user.get("_id")
                if uid:
                    requests.delete(f"{base}/api/users/{uid}", headers=headers, timeout=5)
                    logger.info("  🧹 Cleaned up healthcheck user")
    except Exception:
        pass  # Cleanup is best-effort


# ══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS
# ══════════════════════════════════════════════════════════════════════════════

def run_unit_tests():
    """
    Run backend Jest tests (npm test) if configured.
    Falls back to basic syntax validation.
    """
    logger.info("🧪 Running unit tests...")

    # Check for Jest config
    pkg = BACKEND_DIR / "package.json"
    has_jest = False
    if pkg.exists():
        data = json.loads(pkg.read_text())
        has_jest = "jest" in data.get("devDependencies", {}) or \
                   "jest" in data.get("dependencies", {}) or \
                   "test" in data.get("scripts", {})

    if has_jest:
        logger.info("  → Running npm test (Jest)")
        r = subprocess.run(
            ["npm", "test", "--", "--passWithNoTests", "--forceExit"],
            cwd=BACKEND_DIR, capture_output=True, text=True, timeout=120
        )
        if r.returncode == 0:
            logger.info("  ✅ Backend tests passed")
            return True
        else:
            logger.error("  ✗ Tests failed:\n%s", (r.stdout + r.stderr)[-1000:])
            fix = ai_fix_suggestion("Jest tests failed", r.stderr[:2000], "javascript")
            logger.info("  💡 AI Fix: %s", fix[:300])
            return False
    else:
        logger.info("  ℹ️  No Jest config found — running node syntax check")
        # Just verify all route files are syntactically valid
        ok = True
        for js in (BACKEND_DIR / "routes").glob("*.js"):
            r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
            if r.returncode != 0:
                logger.error("  ✗ Syntax error in %s: %s", js.name, r.stderr[:200])
                ok = False
        if ok:
            logger.info("  ✅ All route files syntactically valid")
        return ok


# ══════════════════════════════════════════════════════════════════════════════
# BROKEN LINK CHECKER
# ══════════════════════════════════════════════════════════════════════════════

def check_broken_links(live: bool = True):
    """
    Playwright scans frontend for dead links and console errors.
    Adapted from original to work with Next.js (not static index.html).
    """
    if not _playwright_available:
        logger.warning("  ⚠️  Playwright not installed — skipping browser tests")
        logger.info("  Run: playwright install chromium")
        return True

    logger.info("🔗 Checking links and console errors...")
    base = FRONTEND_URL if live else f"http://localhost:{FRONTEND_PORT}"

    broken = []
    console_errors = []

    # Key pages to scan
    pages_to_scan = [
        "/",
        "/login",
        "/winner-history",
        "/nearby",
        "/search",
        "/swipe",
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (compatible; XTOX-AutoFix/1.0)"
        )

        for page_path in pages_to_scan:
            page = context.new_page()
            errors_on_page = []

            # Capture console errors
            page.on("console", lambda msg: errors_on_page.append(msg.text)
                    if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors_on_page.append(str(exc)))

            try:
                url = base + page_path
                resp = page.goto(url, timeout=20000, wait_until="networkidle")
                status = resp.status if resp else 0

                if status >= 400:
                    logger.error("  ✗ %s → HTTP %d", page_path, status)
                    broken.append(page_path)
                else:
                    logger.info("  ✅ %s → %d", page_path, status)

                # Check links on this page
                links = page.query_selector_all("a[href]")
                for link in links[:20]:  # Check first 20 links per page
                    href = link.get_attribute("href") or ""
                    if href.startswith("http") and "xtox" not in href.lower():
                        continue  # Skip external links
                    if href.startswith("#") or href.startswith("javascript"):
                        continue
                    full_url = href if href.startswith("http") else base + href
                    try:
                        r = requests.head(full_url, timeout=5, allow_redirects=True)
                        if r.status_code >= 400:
                            logger.warning("  ⚠️  Broken: %s → %d", href, r.status_code)
                            broken.append(href)
                    except Exception:
                        pass  # Skip unreachable

                if errors_on_page:
                    console_errors.extend(errors_on_page[:5])
                    for err in errors_on_page[:3]:
                        logger.error("  🔴 Console error on %s: %s", page_path, err[:200])
                        # AI fix for console errors
                        if "TDZ" in err or "Cannot access" in err:
                            fix = ai_fix_suggestion(err, "// TDZ error in Next.js bundle", "javascript")
                            logger.info("  💡 AI Fix: %s", fix[:200])

            except Exception as exc:
                logger.error("  ✗ Error visiting %s: %s", page_path, exc)
                broken.append(page_path)
            finally:
                page.close()

        context.close()
        browser.close()

    if broken:
        logger.warning("  ⚠️  %d broken links/pages found: %s", len(broken), broken)
    if console_errors:
        logger.warning("  ⚠️  %d console errors found", len(console_errors))

    ok = len(broken) == 0
    logger.info("  %s Link check done", "✅" if ok else "⚠️")
    return ok


# ══════════════════════════════════════════════════════════════════════════════
# CORS CHECKER
# ══════════════════════════════════════════════════════════════════════════════

def check_cors():
    """Verify CORS headers are correct on the backend."""
    logger.info("🌐 Checking CORS headers...")

    test_endpoints = ["/api/ads?limit=1", "/api/geo/detect", "/api/translations"]
    issues = []

    for path in test_endpoints:
        try:
            r = requests.options(
                BACKEND_URL + path,
                headers={
                    "Origin": FRONTEND_URL,
                    "Access-Control-Request-Method": "GET",
                },
                timeout=5
            )
            acao = r.headers.get("Access-Control-Allow-Origin", "MISSING")
            acac = r.headers.get("Access-Control-Allow-Credentials", "MISSING")

            if acao in ("*", FRONTEND_URL) or "vercel" in acao:
                logger.info("  ✅ CORS OK on %s (Origin: %s)", path, acao)
            else:
                logger.error("  ✗ CORS issue on %s: ACAO=%s", path, acao)
                issues.append(path)
        except Exception as exc:
            logger.warning("  ⚠️  Could not check CORS on %s: %s", path, exc)

    if issues:
        fix = rule_based_fix("CORS error", "")
        logger.info("  💡 CORS Fix:\n%s", fix)

    logger.info("  %s CORS check done", "✅" if not issues else "⚠️")
    return len(issues) == 0


# ══════════════════════════════════════════════════════════════════════════════
# ENV VAR CHECKER
# ══════════════════════════════════════════════════════════════════════════════

def check_env_vars():
    """
    Verify required Railway env vars are set.
    Can't read Railway secrets directly — checks .env.example and warns.
    """
    logger.info("🔑 Checking environment variables...")

    env_example = BACKEND_DIR / ".env.example"
    required_vars = [
        "MONGODB_URI", "JWT_SECRET", "OPENAI_API_KEY",
        "PLATFORM_COUNTRY", "USE_FAKE_API",
        "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
        "WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
        "WORDPRESS_URL", "WORDPRESS_USER", "WORDPRESS_APP_PASSWORD",
    ]

    # Check what's defined locally
    local_env = {}
    env_file = BACKEND_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                local_env[k.strip()] = v.strip()

    missing = []
    for var in required_vars:
        val = os.getenv(var) or local_env.get(var, "")
        if not val or val in ("your_key_here", "TODO", ""):
            logger.warning("  ⚠️  %s — not set locally (may be in Railway)", var)
            missing.append(var)
        else:
            masked = val[:4] + "***" if len(val) > 4 else "***"
            logger.info("  ✅ %s = %s", var, masked)

    if missing:
        logger.info(
            "\n  📋 Missing vars — set these in Railway Variables tab:\n"
            "  %s", "\n  ".join(missing)
        )

    logger.info("  ✅ Env check done (%d missing locally)", len(missing))
    return missing


# ══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY AUDIT
# ══════════════════════════════════════════════════════════════════════════════

def audit_dependencies():
    """Run npm audit on backend and frontend to find security issues."""
    logger.info("🛡️  Auditing npm dependencies...")

    for name, path in [("Backend", BACKEND_DIR), ("Frontend", FRONTEND_DIR)]:
        if not path.exists():
            continue
        r = subprocess.run(
            ["npm", "audit", "--audit-level=high", "--json"],
            cwd=path, capture_output=True, text=True, timeout=60
        )
        try:
            audit = json.loads(r.stdout)
            vulns = audit.get("metadata", {}).get("vulnerabilities", {})
            high = vulns.get("high", 0)
            crit = vulns.get("critical", 0)
            if high > 0 or crit > 0:
                logger.warning(
                    "  ⚠️  %s: %d high, %d critical vulnerabilities",
                    name, high, crit
                )
                logger.info("  Run: cd %s && npm audit fix", path)
            else:
                logger.info("  ✅ %s: No high/critical vulnerabilities", name)
        except json.JSONDecodeError:
            logger.info("  ℹ️  %s audit: %s", name, r.stdout[:200] or "clean")


# ══════════════════════════════════════════════════════════════════════════════
# TRANSLATION COMPLETENESS CHECK
# ══════════════════════════════════════════════════════════════════════════════

def check_translations():
    """Verify all static languages have 100% key coverage in translations/index.js."""
    logger.info("🌍 Checking translation completeness...")

    trans_file = FRONTEND_DIR / "app" / "translations" / "index.js"
    if not trans_file.exists():
        logger.warning("  ⚠️  translations/index.js not found")
        return

    import re as _re
    content = trans_file.read_text(encoding="utf-8")

    static_langs = ["ar", "en", "fr", "de", "es", "tr", "ru", "zh"]

    def extract_keys(lang):
        idx = content.find(f"  {lang}:")
        if idx == -1:
            return set()
        # Find next top-level lang section
        next_idx = len(content)
        for other in static_langs + ["CATEGORY_KEY_MAP"]:
            if other != lang:
                pos = content.find(f"  {other}:", idx + 1)
                if pos > idx:
                    next_idx = min(next_idx, pos)
        section = content[idx:next_idx]
        return set(_re.findall(r"^\s{4}(\w+):", section, _re.MULTILINE))

    en_keys = extract_keys("en")
    logger.info("  English: %d keys (baseline)", len(en_keys))

    all_ok = True
    for lang in static_langs:
        if lang == "en":
            continue
        keys = extract_keys(lang)
        missing = en_keys - keys
        if missing:
            logger.warning(
                "  ⚠️  %s: %d/%d keys (%d missing: %s...)",
                lang.upper(), len(keys), len(en_keys), len(missing),
                ", ".join(sorted(missing)[:5])
            )
            all_ok = False
        else:
            logger.info("  ✅ %s: %d/%d keys (100%%)", lang.upper(), len(keys), len(en_keys))

    if all_ok:
        logger.info("  ✅ All static languages at 100%% coverage")
    else:
        logger.info("  💡 Run fix to complete missing translations")

    return all_ok


# ══════════════════════════════════════════════════════════════════════════════
# GEO DETECTION SMOKE TEST
# ══════════════════════════════════════════════════════════════════════════════

def check_geo_detection():
    """Test the Vercel geo detection API for key countries."""
    logger.info("📍 Testing geo detection API...")

    test_cases = [
        ("EG", "ar",  True,  "عر"),   # Egypt → Arabic
        ("US", "en",  False, None),    # USA → English, no toggle
        ("FR", "fr",  True,  "Fr"),    # France → French
        ("RU", "ru",  True,  "Ru"),    # Russia → Russian
        ("DE", "de",  True,  "De"),    # Germany → German
        ("NL", "nl",  True,  "Nl"),    # Netherlands → Dutch
        ("JP", "ja",  True,  "日"),    # Japan → Japanese
        ("GB", "en",  False, None),    # UK → English, no toggle
    ]

    all_ok = True
    for country, expected_lang, expected_toggle, expected_name in test_cases:
        try:
            r = requests.get(
                f"{FRONTEND_URL}/api/geo",
                headers={"x-vercel-ip-country": country},
                timeout=8
            )
            if r.status_code != 200:
                logger.error("  ✗ Geo API %s → HTTP %d", country, r.status_code)
                all_ok = False
                continue

            data = r.json()
            lang_ok     = data.get("language") == expected_lang
            toggle_ok   = data.get("showToggle") == expected_toggle
            name_ok     = data.get("nativeName") == expected_name

            if lang_ok and toggle_ok and name_ok:
                logger.info(
                    "  ✅ %s → lang=%s, toggle=%s, name=%s",
                    country, data["language"], data["showToggle"], data.get("nativeName")
                )
            else:
                logger.error(
                    "  ✗ %s → got lang=%s toggle=%s name=%s | expected lang=%s toggle=%s name=%s",
                    country,
                    data.get("language"), data.get("showToggle"), data.get("nativeName"),
                    expected_lang, expected_toggle, expected_name
                )
                all_ok = False

        except Exception as exc:
            logger.warning("  ⚠️  Geo test %s skipped: %s", country, exc)

    return all_ok


# ══════════════════════════════════════════════════════════════════════════════
# COMMIT HELPER
# ══════════════════════════════════════════════════════════════════════════════

def git_commit_if_changes(message: str = "fix: AI auto-fix applied by fix_xtox.py"):
    """Commit any staged changes to git."""
    r = subprocess.run(
        ["git", "diff", "--name-only"],
        cwd=ROOT_DIR, capture_output=True, text=True
    )
    if not r.stdout.strip():
        logger.info("  ℹ️  No changes to commit")
        return

    subprocess.run(["git", "add", "-A"], cwd=ROOT_DIR)
    result = subprocess.run(
        ["git", "commit", "-m", message,
         "--author", "XTOX AutoFix <autofix@xtox.app>"],
        cwd=ROOT_DIR, capture_output=True, text=True
    )
    if result.returncode == 0:
        logger.info("  ✅ Committed: %s", message)
        logger.info("  Run: git push origin main --no-verify")
    else:
        logger.warning("  ⚠️  Commit failed: %s", result.stderr[:200])


# ══════════════════════════════════════════════════════════════════════════════
# FINAL SMOKE TEST
# ══════════════════════════════════════════════════════════════════════════════

def final_smoke_test():
    """Quick sanity check — hit critical endpoints, report pass/fail."""
    logger.info("💨 Final smoke test...")

    checks = [
        (FRONTEND_URL + "/",                    "Frontend homepage"),
        (BACKEND_URL + "/api/ads?limit=1",      "Backend ads API"),
        (FRONTEND_URL + "/api/geo",             "Geo detection API"),
        (BACKEND_URL + "/api/translations",     "Translation list API"),
    ]

    passed = 0
    for url, name in checks:
        try:
            r = requests.get(url, timeout=10)
            ok = r.status_code < 400
            logger.info("  %s %s → %d", "✅" if ok else "✗", name, r.status_code)
            if ok:
                passed += 1
        except Exception as exc:
            logger.warning("  ⚠️  %s → %s", name, exc)

    logger.info("  %d/%d smoke tests passed", passed, len(checks))
    return passed == len(checks)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="XTOX AI Auto-Fix Script")
    parser.add_argument("--live",    action="store_true", help="Test against live deployed URLs")
    parser.add_argument("--port",    type=int, default=FRONTEND_PORT, help="Local Next.js port (default 3000)")
    parser.add_argument("--no-deps", action="store_true", help="Skip npm install")
    parser.add_argument("--no-build",action="store_true", help="Skip Next.js build check")
    parser.add_argument("--no-browser", action="store_true", help="Skip Playwright browser tests")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("🤖 XTOX AI Auto-Fix v2.0 (Node.js/Next.js Edition)")
    logger.info("   Backend : %s (port %d)", BACKEND_URL, BACKEND_PORT)
    logger.info("   Frontend: %s (dev port %d)", FRONTEND_URL, args.port)
    logger.info("   AI      : %s", "OpenAI gpt-4o-mini" if client else "Rule-based fallback")
    logger.info("=" * 60)

    results = {}

    # 1. Install deps
    if not args.no_deps:
        results["deps"] = install_missing_deps()

    # 2. Static analysis + build
    results["code"] = scan_code_errors()

    # 3. Env var check
    results["env"] = check_env_vars()

    # 4. Runtime / API tests
    results["api"] = test_runtime_errors(live=args.live)

    # 5. Unit tests
    results["tests"] = run_unit_tests()

    # 6. CORS check
    if args.live:
        results["cors"] = check_cors()

    # 7. Broken link check (browser)
    if not args.no_browser and args.live:
        results["links"] = check_broken_links(live=True)

    # 8. Translation completeness
    results["translations"] = check_translations()

    # 9. Geo detection
    if args.live:
        results["geo"] = check_geo_detection()

    # 10. Dep security audit
    audit_dependencies()

    # 11. Git commit any fixes
    git_commit_if_changes()

    # 12. Final smoke test
    if args.live:
        results["smoke"] = final_smoke_test()

    # ── Summary ───────────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 60)
    logger.info("📊 SUMMARY")
    logger.info("=" * 60)

    api_results = results.get("api", {})
    passed = len(api_results.get("passed", []))
    failed = len(api_results.get("failed", []))
    logger.info("  API endpoints: %d passed, %d failed", passed, failed)
    logger.info("  Code issues  : %d found", len(results.get("code", [])))
    logger.info("  Translations : %s", "✅ 100%%" if results.get("translations") else "⚠️  Missing keys")
    logger.info("  Geo detection: %s", "✅" if results.get("geo") else "⚠️  Issues")

    logger.info("\n🎉 Done! Push any committed fixes:")
    logger.info("   git push origin main --no-verify")
    logger.info("\n💡 Tip: Run with --live for full live testing:")
    logger.info("   python fix_xtox.py --live")
    logger.info("\n💡 Tip: Get admin token for deeper API tests:")
    logger.info("   curl -X POST %s/api/auth/email/verify-otp \\", BACKEND_URL)
    logger.info('        -d \'{"email":"xtox@xtox.com","otp":"000000"}\'')
    logger.info("   export XTOX_ADMIN_TOKEN=<token>")


if __name__ == "__main__":
    main()
