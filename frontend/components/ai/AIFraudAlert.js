'use client';
import { useState } from "react";
import { FOX } from "@/lib/XTOXClient";
import { Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function AIFraudAlert({ title, description, price, category }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const check = async () => {
    if (!title) return;
    setLoading(true);
    try {
      const response = await FOX.integrations.Core.InvokeLLM({
        prompt: `You are a fraud detection AI for FOX classified marketplace.
Analyze this listing for potential fraud, scams, or policy violations:

Title: "${title}"
Description: "${description || ""}"
Price: ${price || "not set"}
Category: ${category || "unknown"}

Common fraud patterns: unrealistically low prices, advance payment requests, duplicate content, illegal items, misleading descriptions, spam keywords.

Return a JSON object with exactly these fields:
- risk_level: "low", "medium", or "high" (string)
- is_suspicious: true or false (boolean)
- flags: array of specific concerns (max 3, empty array if clean)
- verdict: one sentence summary (string)

Respond ONLY with valid JSON.`,
      });

      let parsed = null;
      try {
        const text = response?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = { risk_level: "low", is_suspicious: false, flags: [], verdict: "Unable to analyze — add an AI API key for fraud detection." };
      }
      setResult(parsed);
    } catch {
      setResult({ risk_level: "low", is_suspicious: false, flags: [], verdict: "Analysis unavailable." });
    }
    setLoading(false);
  };

  const riskStyles = {
    low: { background: "#f0fdf4", border: "1px solid #bbf7d0", textColor: "#15803d", Icon: CheckCircle, iconColor: "#16a34a", label: "خطر منخفض / Low Risk" },
    medium: { background: "#fefce8", border: "1px solid #fde047", textColor: "#a16207", Icon: AlertTriangle, iconColor: "#ca8a04", label: "خطر متوسط / Medium Risk" },
    high: { background: "#fef2f2", border: "1px solid #fca5a5", textColor: "#b91c1c", Icon: AlertTriangle, iconColor: "#dc2626", label: "خطر عالي / High Risk" },
  };

  const style = result ? (riskStyles[result.risk_level] || riskStyles.low) : null;

  if (!title) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {!result && !loading && (
        <button type="button" onClick={check} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280",
          border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px",
          background: "none", cursor: "pointer", fontFamily: "inherit",
        }}>
          <Shield style={{ width: 14, height: 14 }} />
          فحص الاحتيال بالذكاء الاصطناعي / AI Fraud Check
        </button>
      )}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
          <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          جاري الفحص...
        </div>
      )}
      {result && style && (
        <div style={{ borderRadius: 10, border: style.border, padding: 12, background: style.background }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <style.Icon style={{ width: 16, height: 16, color: style.iconColor }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: style.textColor }}>{style.label}</span>
          </div>
          <p style={{ fontSize: 12, color: style.textColor, margin: "0 0 4px" }}>{result.verdict}</p>
          {result.flags?.map((f, i) => (
            <p key={i} style={{ fontSize: 12, color: style.textColor, margin: "2px 0" }}>• {f}</p>
          ))}
        </div>
      )}
    </div>
  );
}
