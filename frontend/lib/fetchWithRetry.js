/**
 * XTOX Smart Error Recovery
 * Wraps fetch with retry logic (3 retries, exponential backoff)
 * Shows Arabic error messages consistently
 * Clears error state on successful retry
 */

const ARABIC_ERRORS = {
  default: 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
  network: 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة.',
  timeout: 'انتهت مهلة الاتصال. يرجى المحاولة مجدداً.',
  server: 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
  notFound: 'المحتوى المطلوب غير موجود.',
  unauthorized: 'يجب تسجيل الدخول للمتابعة.',
  forbidden: 'ليس لديك صلاحية للوصول.',
  rateLimit: 'تجاوزت الحد المسموح. انتظر قليلاً.',
};

function getArabicError(status, err) {
  if (!status && err?.message?.includes('fetch')) return ARABIC_ERRORS.network;
  if (!status && err?.message?.includes('timeout')) return ARABIC_ERRORS.timeout;
  if (status === 401 || status === 403) return status === 401 ? ARABIC_ERRORS.unauthorized : ARABIC_ERRORS.forbidden;
  if (status === 404) return ARABIC_ERRORS.notFound;
  if (status === 429) return ARABIC_ERRORS.rateLimit;
  if (status >= 500) return ARABIC_ERRORS.server;
  return ARABIC_ERRORS.default;
}

/**
 * Fetch with automatic retry + exponential backoff
 * @param {string} url
 * @param {RequestInit} options
 * @param {object} config
 * @param {number} config.retries - max retries (default 3)
 * @param {number} config.baseDelay - base delay in ms (default 500)
 * @param {function} config.onRetry - called on each retry with (attempt, error)
 * @returns {Promise<Response>} resolved response
 * @throws enriched Error with .arabicMessage property
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const { retries = 3, baseDelay = 500, onRetry } = config;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Success — return response
      if (res.ok) return res;

      // Non-retryable errors: all 4xx errors (including 429 — intentional limits should not be retried)
      if (res.status >= 400 && res.status < 500) {
        const err = new Error('HTTP ' + res.status);
        err.status = res.status;
        err.response = res; // attach original response so callers can read body
        err.arabicMessage = getArabicError(res.status, err);
        throw err;
      }

      // Retryable (5xx only)
      lastError = new Error('HTTP ' + res.status);
      lastError.status = res.status;
      lastError.arabicMessage = getArabicError(res.status, lastError);

    } catch (e) {
      if (e.name === 'AbortError') {
        e.arabicMessage = ARABIC_ERRORS.timeout;
      } else if (!e.arabicMessage) {
        e.arabicMessage = getArabicError(null, e);
      }

      // Non-retriable: client errors
      if (e.status >= 400 && e.status < 500) throw e; // all 4xx including 429 are non-retryable

      lastError = e;
    }

    // Don't delay after last attempt
    if (attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt); // 500ms, 1s, 2s
      if (onRetry) onRetry(attempt + 1, lastError);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * JSON fetch shorthand — parses JSON from response
 */
export async function fetchJSON(url, options = {}, config = {}) {
  const res = await fetchWithRetry(url, options, config);
  return res.json();
}

export default fetchWithRetry;
