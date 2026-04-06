'use client';
import { useState } from "react";
import { FOX } from "@/lib/XTOXClient";
import { Wand2, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function AIAdImprover({ title, description, price, category, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    if (!title && !description) return;
    setLoading(true);
    setExpanded(true);

    try {
      const result = await FOX.integrations.Core.InvokeLLM({
        prompt: 'You are an expert marketplace listing optimizer for FOX classified marketplace.\nAnalyze this listing and provide concrete improvements:\n\nTitle: "' + (title || "Not provided") + '"\nDescription: "' + (description || "Not provided") + '"\nPrice: ' + (price || "Not provided") + '\nCategory: ' + (category || "Not provided") + '\n\nReturn a JSON object with exactly these fields:\n- improved_title: a better, more specific, SEO-friendly title (max 80 chars)\n- improved_description: a more compelling, detailed description (3-4 sentences)\n- issues: array of specific problems found (max 4 items)\n- price_feedback: brief comment on the price (1 sentence)\n- score: listing quality score 1-10 (number)\n\nRespond ONLY with valid JSON.',
      });

      let parsed = null;
      try {
        const text = result?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = {
          improved_title: title,
          improved_description: description,
          issues: ["Could not analyze — add an AI API key to improve results"],
          price_feedback: "",
          score: 5,
        };
      }
      setSuggestions(parsed);
    } catch {
      setSuggestions({
        improved_title: title,
        improved_description: description,
        issues: ["AI analysis unavailable — check API configuration"],
        price_feedback: "",
        score: 5,
      });
    }
    setLoading(false);
  };

  const scoreColor = (s) => {
    if (s >= 8) return { color: "#16a34a", background: "#f0fdf4" };
    if (s >= 5) return { color: "#ca8a04", background: "#fefce8" };
    return { color: "#dc2626", background: "#fef2f2" };
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
      <button
        type="button"
        onClick={suggestions ? () => setExpanded(!expanded) : analyze}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "linear-gradient(to right, #f5f3ff, #faf5ff)",
          border: "none", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wand2 style={{ width: 16, height: 16, color: "#7c3aed" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#6d28d9" }}>تحسين الإعلان بالذكاء الاصطناعي</span>
          {suggestions && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 700, ...scoreColor(suggestions.score) }}>
              {suggestions.score}/10
            </span>
          )}
        </div>
        {loading ? <Loader2 style={{ width: 16, height: 16, color: "#7c3aed", animation: "spin 1s linear infinite" }} /> :
          expanded ? <ChevronUp style={{ width: 16, height: 16, color: "#7c3aed" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#7c3aed" }} />}
      </button>

      {expanded && suggestions && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, background: "white" }}>
          {suggestions.issues?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>المشكلات المكتشفة</p>
              {suggestions.issues.map((issue, i) => (
                <p key={i} style={{ fontSize: 13, color: "#c2410c", margin: "4px 0" }}>⚠ {issue}</p>
              ))}
            </div>
          )}

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>العنوان المقترح</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 13, background: "#f3f4f6", borderRadius: 8, padding: "8px 12px", flex: 1, fontWeight: 500, margin: 0 }}>{suggestions.improved_title}</p>
              <button type="button" onClick={() => onApply?.({ title: suggestions.improved_title })}
                style={{ fontSize: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                استخدام
              </button>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>الوصف المقترح</p>
            <p style={{ fontSize: 13, background: "#f3f4f6", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6, margin: "0 0 8px" }}>{suggestions.improved_description}</p>
            <button type="button" onClick={() => onApply?.({ description: suggestions.improved_description })}
              style={{ fontSize: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-end", display: "block", marginRight: "auto" }}>
              استخدام الوصف
            </button>
          </div>

          {suggestions.price_feedback && (
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#1d4ed8" }}>
              💰 {suggestions.price_feedback}
            </div>
          )}

          <button type="button" onClick={() => onApply?.({ title: suggestions.improved_title, description: suggestions.improved_description })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#7c3aed", color: "white", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
            <CheckCircle style={{ width: 16, height: 16 }} />
            تطبيق جميع التحسينات
          </button>
        </div>
      )}

      {expanded && loading && (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "white" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#7c3aed", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 13, color: "#6b7280" }}>الذكاء الاصطناعي يحلل إعلانك...</p>
        </div>
      )}
    </div>
  );
}
