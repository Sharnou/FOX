'use client';
import { useState, useEffect, useRef } from "react";
import { FOX } from "@/lib/XTOXClient";
import { X, Send, Minimize2, Maximize2, Zap, Loader2, Mic } from "lucide-react";
import { usePathname } from "next/navigation";

const COUNTRY_HINTS = {
  EG: { country: "Egypt", currency: "EGP", lang: "ar", flag: "🇪🇬" },
  AE: { country: "UAE", currency: "AED", lang: "en", flag: "🇦🇪" },
  SA: { country: "Saudi Arabia", currency: "SAR", lang: "ar", flag: "🇸🇦" },
  US: { country: "USA", currency: "USD", lang: "en", flag: "🇺🇸" },
  GB: { country: "UK", currency: "GBP", lang: "en", flag: "🇬🇧" },
  FR: { country: "France", currency: "EUR", lang: "fr", flag: "🇫🇷" },
  DE: { country: "Germany", currency: "EUR", lang: "de", flag: "🇩🇪" },
};

const PAGE_CONTEXT = {
  "/": "The user is on the FOX homepage browsing listings.",
  "/sell": "The user is on the Sell page trying to post a new ad listing.",
  "/search": "The user is searching for listings.",
  "/profile": "The user is on their profile page.",
  "/admin": "The user is on the admin panel managing the platform.",
};

const QUICK_ACTIONS = [
  { label: "كيف أنشر إعلاناً؟", icon: "📋" },
  { label: "نصائح الأمان", icon: "🛡️" },
  { label: "How to post an ad?", icon: "📋" },
  { label: "Safety tips", icon: "🛡️" },
];

export default function AIAssistant({ detectedCountry, user }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !hasGreeted) {
      sendGreeting();
      setHasGreeted(true);
    }
  }, [open]);

  const sendGreeting = async () => {
    setLoading(true);
    const pageCtx = PAGE_CONTEXT[pathname] || "The user is browsing FOX marketplace.";
    const userCtx = user ? 'User is logged in as ' + (user.full_name || user.email) + '.' : "User is not logged in.";
    const countryCtx = detectedCountry ? 'Detected country: ' + detectedCountry + '.' : "";

    try {
      const result = await FOX.integrations.Core.InvokeLLM({
        prompt: 'You are FOX AI Assistant — a friendly, smart co-pilot for the FOX international classified marketplace.\n' + pageCtx + ' ' + userCtx + ' ' + countryCtx + '\nGenerate a short, warm, helpful greeting (2-3 sentences). Mention what you can help with. Use emojis. Be concise.\nRespond in Arabic and English. You are "FOX AI" — do NOT call yourself Claude or any other AI model name.',
      });
      const greeting = result?.text || "مرحباً! أنا FOX AI، مساعدك الذكي. 👋 كيف يمكنني مساعدتك اليوم؟";
      setMessages([{ role: "assistant", content: greeting }]);
    } catch {
      setMessages([{ role: "assistant", content: "مرحباً! أنا FOX AI، مساعدك الذكي. 👋 كيف يمكنني مساعدتك اليوم؟" }]);
    }
    setLoading(false);
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const pageCtx = PAGE_CONTEXT[pathname] || "FOX marketplace.";
    const userCtx = user ? 'User: ' + (user.full_name || user.email) : "Not logged in.";
    const history = messages.slice(-6).map(m => (m.role === "user" ? "User" : "AI") + ': ' + m.content).join("\n");

    try {
      const result = await FOX.integrations.Core.InvokeLLM({
        prompt: 'You are FOX AI Assistant — a smart co-pilot for FOX international classified marketplace.\nContext: ' + pageCtx + '\nUser info: ' + userCtx + '\nCountry: ' + (detectedCountry || "Unknown") + '\n\nConversation history:\n' + history + '\n\nUser message: "' + userMsg + '"\n\nYou help users with:\n- Registering and logging in\n- Posting and improving their ads (suggest better titles, descriptions, pricing)\n- Navigating the marketplace\n- Answering questions about buying and selling safely\n- Fraud awareness and safety tips\n\nReply in the SAME LANGUAGE the user is using. Be concise, friendly, helpful. Max 200 words.\nNEVER say you are Claude or any AI model — you are "FOX AI".',
      });
      setMessages(prev => [...prev, { role: "assistant", content: result?.text || "آسف، حدث خطأ. حاول مرة أخرى." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "آسف، حدث خطأ في الاتصال. حاول مرة أخرى." }]);
    }
    setLoading(false);
  };

  const handleVoice = () => {
    if (typeof window === "undefined") return;
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.start();
    setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };



  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 50,
            width: 56, height: 56, background: "#2563eb", borderRadius: "50%",
            boxShadow: "0 10px 25px rgba(37,99,235,0.4)", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s",
          }}
          title="FOX AI Assistant"
        >
          <Zap style={{ width: 24, height: 24, color: "white" }} />
        </button>
      )}

      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50,
          background: "white", border: "1px solid #e5e7eb", borderRadius: 16,
          boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column",
          width: minimized ? 288 : 384, height: minimized ? 56 : 520,
          transition: "all 0.3s",
        }}>
          {/* Header */}
          <div style={{
            background: "#2563eb", color: "white", padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: "16px 16px 0 0", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap style={{ width: 16, height: 16, color: "#fbbf24" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>FOX AI</p>
                <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>مساعدك الذكي</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setMinimized(!minimized)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 4, borderRadius: 6 }}>
                {minimized ? <Maximize2 style={{ width: 16, height: 16 }} /> : <Minimize2 style={{ width: 16, height: 16 }} />}
              </button>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 4, borderRadius: 6 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 14 }}>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    <span>FOX AI يفكر...</span>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
                      background: msg.role === "user" ? "#2563eb" : "#f3f4f6",
                      color: msg.role === "user" ? "white" : "#111827",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && messages.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: "16px 16px 16px 4px", padding: "8px 12px" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, background: "#9ca3af", borderRadius: "50%", animation: 'bounce 0.6s ' + i * 0.15 + 's infinite alternate' }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 1 && !loading && (
                <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => sendMessage(a.label)} style={{
                      fontSize: 11, background: "#f3f4f6", border: "1px solid #e5e7eb",
                      borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                      fontFamily: "inherit", color: "#374151",
                    }}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={handleVoice} style={{
                  background: listening ? "#fee2e2" : "#f3f4f6", border: "none", borderRadius: 10,
                  padding: 8, cursor: "pointer", flexShrink: 0, color: listening ? "#ef4444" : "#6b7280",
                }}>
                  <Mic style={{ width: 16, height: 16 }} />
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="اكتب سؤالك... / Ask anything..."
                  style={{
                    flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10,
                    padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
                  }}
                  disabled={loading}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
                  background: loading || !input.trim() ? "#d1d5db" : "#2563eb", border: "none",
                  borderRadius: 10, padding: 8, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}>
                  <Send style={{ width: 16, height: 16, color: "white" }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
