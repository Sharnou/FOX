'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { Zap, Send, Mic, Loader2, Bot } from 'lucide-react';
import { FOX } from '@/lib/XTOXClient';
import Link from 'next/link';

// Module-level to avoid TDZ after SWC minification
const QUICK_PROMPTS = [
  'كيف أنشر إعلاناً؟ / How to post an ad?',
  'نصائح الأمان / Safety tips',
  'كيف أحسّن إعلاني؟ / How to improve my ad?',
  'ما هي الفئات المتاحة؟ / What categories are available?',
];


export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'مرحباً! أنا FOX AI، مساعدك الذكي في سوق FOX للإعلانات. 👋\nHello! I\'m FOX AI, your smart assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const history = messages.slice(-8).map(m => (m.role === 'user' ? 'User' : 'AI') + ': ' + m.content).join('\n');

    try {
      const result = await FOX.integrations.Core.InvokeLLM({
        prompt: 'You are FOX AI Assistant — a helpful co-pilot for FOX international classified marketplace.\n\nPrevious conversation:\n' + history + '\n\nUser message: "' + userMsg + '"\n\nYou help users with:\n- Posting and improving marketplace ads\n- Buying and selling safely\n- Navigating the platform\n- Fraud awareness and safety tips\n- Pricing advice\n\nReply in the SAME LANGUAGE as the user. Be concise, friendly, and helpful. Max 200 words.\nYou are "FOX AI" — never call yourself Claude or any other AI model.',
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result?.text || 'عذراً، حدث خطأ. حاول مرة أخرى.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال. / Sorry, connection error. Try again.' }]);
    }
    setLoading(false);
  };

  const handleVoice = () => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'ar-EG';
    recognition.start();
    setListening(true);
    recognition.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  // QUICK moved to module level to avoid TDZ

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', direction: 'rtl', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: '#2563eb', color: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/ai-tools" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>← أدوات AI</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>FOX AI Assistant</h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>مساعدك الذكي في سوق FOX</p>
          </div>
        </div>
        <div style={{ marginRight: 'auto', fontSize: 12, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
          متاح الآن / Online
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0, marginTop: 4 }}>
                <Zap style={{ width: 14, height: 14, color: '#fbbf24' }} />
              </div>
            )}
            <div style={{
              maxWidth: '75%', borderRadius: msg.role === 'user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
              padding: '12px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? '#f3f4f6' : '#2563eb',
              color: msg.role === 'user' ? '#111827' : 'white',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: 14, height: 14, color: '#fbbf24' }} />
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: '#9ca3af', borderRadius: '50%', animation: 'bounce 0.6s ' + i*0.15 + 's infinite alternate' }} />)}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <p style={{ width: '100%', fontSize: 12, color: '#6b7280', margin: 0 }}>اقتراحات سريعة:</p>
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{
                fontSize: 13, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Fixed Input */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white',
        borderTop: '1px solid #e5e7eb', padding: '12px 16px', boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 8 }}>
          <button onClick={handleVoice} style={{
            background: listening ? '#fee2e2' : '#f3f4f6', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: listening ? '#ef4444' : '#6b7280', flexShrink: 0,
          }}>
            <Mic style={{ width: 18, height: 18 }} />
          </button>
          <input
            id="ai-assistant-input"
            name="ai-assistant-query"
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="اكتب سؤالك... / Type your question..."
            style={{
              flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 10,
              padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
            background: loading || !input.trim() ? '#d1d5db' : '#2563eb',
            border: 'none', borderRadius: 10, padding: 10, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}>
            <Send style={{ width: 18, height: 18, color: 'white' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
