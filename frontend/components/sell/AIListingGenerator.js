'use client';
import { useState } from "react";
import { Zap, Loader2, CheckCircle, Camera } from "lucide-react";
import { FOX } from "@/lib/XTOXClient";

export default function AIListingGenerator({ onGenerated }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [generatingFromText, setGeneratingFromText] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const supported = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!supported.includes(file.type)) {
      alert("نوع الملف غير مدعوم. يرجى رفع صورة JPG أو PNG أو WEBP.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await FOX.integrations.Core.UploadFile({ file });
      setUploadedImageUrl(file_url);
      setUploading(false);
      await analyzeImage(file_url);
    } catch {
      setUploading(false);
    }
  };

  const analyzeImage = async (imageUrl) => {
    setAnalyzing(true);
    try {
      const response = await FOX.integrations.Core.InvokeLLM({
        prompt: `You are an AI listing generator for a classified marketplace called FOX.
Analyze this product and generate a complete marketplace listing.
Return a JSON object with: title (catchy, SEO-friendly, max 80 chars), description (3-4 sentences, highlight key features),
category (one of: vehicles, electronics, real_estate, fashion, home, sports, other), subcategory (specific type),
estimated_price_usd (number), condition (new/like_new/good/fair/poor), key_features (array of 3-5 strings).
Respond ONLY with valid JSON.`,
      });

      let parsed = null;
      try {
        const text = response?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = {
          title: "عنصر مستعمل",
          description: "صنف للبيع بحالة جيدة.",
          category: "other",
          subcategory: "general",
          estimated_price_usd: 50,
          condition: "good",
          key_features: ["حالة جيدة"],
        };
      }

      setResult(parsed);
      onGenerated?.({ ...parsed, images: imageUrl ? [imageUrl] : [], ai_generated: true });
    } catch {
      setResult({ title: "", description: "", category: "other", subcategory: "", estimated_price_usd: 0, condition: "good", key_features: [] });
    }
    setAnalyzing(false);
  };

  const generateFromText = async () => {
    if (!textInput.trim()) return;
    setGeneratingFromText(true);
    try {
      const response = await FOX.integrations.Core.InvokeLLM({
        prompt: `You are an AI listing generator for FOX classified marketplace.
The user described their item as: "${textInput}"

Generate a complete marketplace listing. Return a JSON object with:
- title: catchy, SEO-friendly title (max 80 chars)
- description: compelling description (3-4 sentences)
- category: one of (vehicles, electronics, real_estate, fashion, home, sports, other)
- subcategory: specific type
- estimated_price_usd: estimated price as number
- condition: new/like_new/good/fair/poor
- key_features: array of 3-5 key features

Respond ONLY with valid JSON.`,
      });

      let parsed = null;
      try {
        const text = response?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = { title: textInput, description: textInput, category: "other", subcategory: "", estimated_price_usd: 50, condition: "good", key_features: [] };
      }

      setResult(parsed);
      onGenerated?.({ ...parsed, images: [], ai_generated: true });
    } catch {
      setResult({ title: textInput, description: "", category: "other", subcategory: "", estimated_price_usd: 0, condition: "good", key_features: [] });
    }
    setGeneratingFromText(false);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white",
      borderRadius: 16, padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap style={{ width: 20, height: 20, color: "#fbbf24" }} />
        </div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>مولّد الإعلانات بالذكاء الاصطناعي</h3>
          <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>ارفع صورة أو اكتب وصفاً — الذكاء الاصطناعي ينشئ إعلانك فوراً</p>
        </div>
      </div>

      {!result && !analyzing && (
        <>
          {/* Text input mode */}
          <div style={{ marginBottom: 12 }}>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="صف المنتج الذي تريد بيعه... (مثال: آيفون 14 برو ماكس 256 جيجا أسود بحالة ممتازة)"
              style={{
                width: "100%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 13, fontFamily: "inherit",
                resize: "vertical", minHeight: 70, outline: "none", boxSizing: "border-box",
              }}
            />
            <button onClick={generateFromText} disabled={generatingFromText || !textInput.trim()} style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              background: generatingFromText ? "rgba(255,255,255,0.2)" : "#fbbf24",
              color: generatingFromText ? "white" : "#1d4ed8", border: "none", borderRadius: 8,
              padding: "8px 16px", cursor: generatingFromText || !textInput.trim() ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}>
              {generatingFromText ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Zap style={{ width: 14, height: 14 }} />}
              {generatingFromText ? "جاري الإنشاء..." : "إنشاء الإعلان"}
            </button>
          </div>

          <p style={{ textAlign: "center", opacity: 0.6, fontSize: 12, margin: "8px 0" }}>— أو ارفع صورة —</p>

          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            border: "2px dashed rgba(255,255,255,0.3)", borderRadius: 12, padding: 24,
            cursor: "pointer",
          }}>
            <Camera style={{ width: 36, height: 36, opacity: 0.6, marginBottom: 8 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{uploading ? "جاري الرفع..." : "اضغط لرفع صورة"}</span>
            <span style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>JPG, PNG, WEBP حتى 10MB</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} disabled={uploading} />
          </label>
        </>
      )}

      {analyzing && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 12 }}>
          <Loader2 style={{ width: 36, height: 36, color: "#fbbf24", animation: "spin 1s linear infinite" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>الذكاء الاصطناعي يحلل المنتج...</p>
            <p style={{ opacity: 0.6, fontSize: 12, margin: "4px 0 0" }}>يكتشف الفئة، يولد العنوان، يقدر السعر</p>
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fbbf24", fontWeight: 600 }}>
            <CheckCircle style={{ width: 20, height: 20 }} />
            <span>تم إنشاء الإعلان بنجاح!</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <p style={{ margin: 0 }}><strong style={{ color: "#fbbf24" }}>العنوان:</strong> {result.title}</p>
            <p style={{ margin: 0 }}><strong style={{ color: "#fbbf24" }}>الفئة:</strong> {result.category} → {result.subcategory}</p>
            <p style={{ margin: 0 }}><strong style={{ color: "#fbbf24" }}>السعر التقديري:</strong> ${result.estimated_price_usd?.toLocaleString()} USD</p>
            <p style={{ margin: 0 }}><strong style={{ color: "#fbbf24" }}>الحالة:</strong> {result.condition}</p>
          </div>
          {uploadedImageUrl && (
            <img src={uploadedImageUrl} alt="Uploaded" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, border: "2px solid #fbbf24" }} />
          )}
          <button onClick={() => { setResult(null); setUploadedImageUrl(null); setTextInput(""); }}
            style={{ fontSize: 12, opacity: 0.6, background: "none", border: "none", color: "white", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            ↩ إعادة الإنشاء
          </button>
        </div>
      )}
    </div>
  );
}
