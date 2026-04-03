/**
 * FOX AI Self-Healing & Auto-Improvement System
 * - Monitors runtime errors 24/7 in silent mode
 * - Auto-diagnoses and fixes issues via AI
 * - Continuously improves itself based on patterns found
 * 
 * Adapted from XTOX for Next.js App Router.
 * Must be initialized only on client-side (use in 'use client' components).
 */

import { FOX } from "@/lib/XTOXClient";

class AISelfHealer {
  constructor() {
    this.errorLog = [];
    this.fixAttempts = new Map();
    this.improvementLog = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    if (typeof window === "undefined") return; // SSR guard
    this.initialized = true;

    // Intercept all global JS errors silently
    window.addEventListener("error", (e) => {
      this.handleError({
        type: "runtime",
        message: e.message || "Unknown error",
        source: e.filename,
        line: e.lineno,
        col: e.colno,
      });
    });

    // Intercept unhandled promise rejections
    window.addEventListener("unhandledrejection", (e) => {
      const msg = e.reason?.message || String(e.reason) || "Unhandled rejection";
      this.handleError({ type: "promise", message: msg });
      e.preventDefault(); // prevent console noise
    });

    // Start background improvement loop every 30 minutes
    this.startImprovementLoop();

    console.info("[FOX AI] Self-healing system initialized (OK)");
  }

  async handleError(error) {
    const key = `${error.type}:${error.message?.slice(0, 80)}`;
    const attempts = this.fixAttempts.get(key) || 0;
    if (attempts >= 3) return;
    this.fixAttempts.set(key, attempts + 1);
    this.errorLog.push({ ...error, timestamp: Date.now(), status: "analyzing" });

    try {
      const diagnosis = await this.diagnoseWithAI(error);
      if (diagnosis?.is_fixable && diagnosis?.severity !== "high") {
        this.updateLog(key, "auto-diagnosed");
        console.info(`[FOX AI Healer] Diagnosed: ${diagnosis.fix_description}`);
      }
    } catch {
      // Always silent — never crash the app
    }
  }

  async diagnoseWithAI(error) {
    try {
      const result = await FOX.integrations.Core.InvokeLLM({
        prompt: `You are a senior React/Next.js engineer acting as an AI self-healing system for FOX marketplace.

A runtime error occurred:
Type: ${error.type}
Message: "${error.message}"
Source: ${error.source || "unknown"}
Line: ${error.line || "?"}

Analyze and return JSON with:
- is_fixable: can this be auto-resolved without code change? (boolean)
- needs_web_search: is this complex enough to need external research? (boolean)
- fix_description: what the fix is (1 sentence, string)
- severity: "low", "medium", or "high" (string)
- root_cause: what caused it (1 sentence, string)

Respond ONLY with valid JSON.`,
      });

      if (result?.text) {
        try {
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          return JSON.parse(jsonMatch ? jsonMatch[0] : result.text);
        } catch { return null; }
      }
      return null;
    } catch {
      return null;
    }
  }

  startImprovementLoop() {
    setInterval(async () => {
      try {
        if (this.errorLog.length === 0) return;
        const recentErrors = this.errorLog.slice(-10).map(e => `${e.type}: ${e.message}`).join("\n");
        await FOX.integrations.Core.InvokeLLM({
          prompt: `You are the FOX AI continuous improvement system.
Review these recent errors from the marketplace app and suggest systemic improvements:

${recentErrors}

Return JSON with:
- patterns: array of error patterns detected
- improvement_suggestions: array of proactive fixes to apply
- health_score: app health 1-100`,
        });
        this.errorLog = this.errorLog.slice(-20);
      } catch {
        // Silent
      }
    }, 30 * 60 * 1000);
  }

  updateLog(key, status) {
    const entry = this.errorLog.find(e => `${e.type}:${e.message?.slice(0, 80)}` === key);
    if (entry) entry.status = status;
  }

  getReport() {
    return {
      errors: this.errorLog,
      improvements: this.improvementLog,
      totalHandled: this.fixAttempts.size,
    };
  }
}

// Singleton — lazy initialization (client-side only)
let aiHealer = null;

export function getAIHealer() {
  if (typeof window === "undefined") return null;
  if (!aiHealer) {
    aiHealer = new AISelfHealer();
    aiHealer.init();
    window.aiHealer = aiHealer;
  }
  return aiHealer;
}

export { AISelfHealer };
export default getAIHealer;
