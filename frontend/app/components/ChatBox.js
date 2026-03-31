'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ChatBox — Full bilingual Arabic/English WhatsApp-style chat component
 * run-66: full expansion with RTL, Cairo font, emoji, typing indicator,
 *         file attachments, timestamps, online status, auto-scroll,
 *         character count, and WhatsApp-style message bubbles.
 *
 * Props:
 *   targetId   — seller/buyer user ID
 *   adId       — listing ID for context
 *   otherName  — display name of other party (optional)
 *   otherAvatar— avatar URL of other party (optional)
 */

const TRANSLATIONS = {
  ar: {
    typeMessage: 'اكتب رسالة...',
    send: 'إرسال',
    online: 'متصل الآن',
    offline: 'غير متصل',
    typing: 'يكتب...',
    attachFile: 'إرفاق ملف',
    maxChars: 'الحد الأقصى للأحرف',
    today: 'اليوم',
    yesterday: 'أمس',
    delivered: 'تم الإرسال',
    seen: 'تمت القراءة',
    sending: 'جاري الإرسال...',
    chatWith: 'محادثة مع',
    noMessages: 'لا توجد رسائل بعد. ابدأ المحادثة!',
    fileSent: '📎 ملف مرفق',
    imageSent: '🖼️ صورة مرفقة',
    charCount: 'حرف',
  },
  en: {
    typeMessage: 'Type a message...',
    send: 'Send',
    online: 'Online',
    offline: 'Offline',
    typing: 'typing...',
    attachFile: 'Attach file',
    maxChars: 'Max characters',
    today: 'Today',
    yesterday: 'Yesterday',
    delivered: 'Delivered',
    seen: 'Seen',
    sending: 'Sending...',
    chatWith: 'Chat with',
    noMessages: 'No messages yet. Start the conversation!',
    fileSent: '📎 File attached',
    imageSent: '🖼️ Image attached',
    charCount: 'chars',
  },
};

const MAX_CHARS = 500;

const EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '👋', '💯', '🎉', '😍', '🤝'];

function formatTime(date, lang) {
  const d = new Date(date);
  return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'ar',
  });
}

function formatDateLabel(date, lang, t) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return t.today;
  if (d.toDateString() === yesterday.toDateString()) return t.yesterday;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
}

export default function ChatBox({ targetId, adId, otherName = '', otherAvatar = '' }) {
  const [lang, setLang] = useState('ar');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';

  // Load language preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('xtox_lang') || 'ar';
      setLang(storedLang);
    }
  }, []);

  // Simulate online status and typing (in production, use socket.io)
  useEffect(() => {
    const onlineTimer = setTimeout(() => setIsOnline(true), 800);
    const typingTimer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate incoming message
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: lang === 'ar'
              ? 'مرحباً! كيف يمكنني مساعدتك؟ 👋'
              : 'Hello! How can I help you? 👋',
            sender: 'other',
            timestamp: new Date(),
            status: 'seen',
          },
        ]);
      }, 2000);
    }, 1500);

    return () => {
      clearTimeout(onlineTimer);
      clearTimeout(typingTimer);
    };
  }, [lang]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const newMsg = {
      id: Date.now(),
      text,
      sender: 'me',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsSending(true);
    setShowEmoji(false);

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m)
      );
      setIsSending(false);

      // Simulate seen after 1.5s
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => m.id === newMsg.id ? { ...m, status: 'seen' } : m)
        );
      }, 1500);
    }, 800);
  }, [input, isSending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Simulate typing indicator trigger
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 1000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const newMsg = {
      id: Date.now(),
      text: isImage ? t.imageSent : t.fileSent,
      sender: 'me',
      timestamp: new Date(),
      status: 'delivered',
      isFile: true,
      fileName: file.name,
    };
    setMessages(prev => [...prev, newMsg]);
    e.target.value = '';
  };

  const handleEmojiClick = (emoji) => {
    if (input.length < MAX_CHARS) {
      setInput(prev => prev + emoji);
    }
    setShowEmoji(false);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const label = formatDateLabel(msg.timestamp, lang, t);
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
    return groups;
  }, {});

  const avatarFallback = otherName
    ? otherName[0].toUpperCase()
    : (lang === 'ar' ? 'م' : 'U');

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: isRTL ? "'Cairo', 'Segoe UI', sans-serif" : "'Segoe UI', sans-serif" }}
      className="flex flex-col h-[600px] max-h-[90vh] w-full max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden border border-gray-200 bg-white"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{ backgroundColor: '#FF6B35' }}
        className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {otherAvatar ? (
            <img
              src={otherAvatar}
              alt={otherName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {avatarFallback}
            </div>
          )}
          {/* Online dot */}
          <span
            className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-3 h-3 rounded-full border-2 border-white transition-colors duration-500 ${
              isOnline ? 'bg-green-400' : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Name + Status */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {otherName || `${t.chatWith} #${targetId || '...'}`}
          </p>
          <p className="text-xs text-white/80">
            {isTyping ? `${t.typing}` : isOnline ? t.online : t.offline}
          </p>
        </div>

        {/* Lang toggle */}
        <button
          onClick={() => {
            const next = lang === 'ar' ? 'en' : 'ar';
            setLang(next);
            if (typeof window !== 'undefined') localStorage.setItem('xtox_lang', next);
          }}
          className="flex-shrink-0 text-xs bg-white/20 hover:bg-white/30 transition-colors px-2 py-1 rounded-full font-mono"
          aria-label="Toggle language"
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>

      {/* ── Messages Area ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        style={{ background: 'linear-gradient(135deg, #fff8f5 0%, #fff 100%)' }}
        onClick={() => setShowEmoji(false)}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm text-center px-4">{t.noMessages}</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
            <div key={dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] text-gray-400 px-2">{dateLabel}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {msgs.map(msg => (
                <div
                  key={msg.id}
                  className={`flex mb-1 ${msg.sender === 'me'
                    ? isRTL ? 'justify-start' : 'justify-end'
                    : isRTL ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.sender === 'me'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                    }`}
                    style={msg.sender === 'me' ? { backgroundColor: '#FF6B35' } : {}}
                  >
                    <p className={`leading-relaxed break-words ${msg.isFile ? 'italic text-xs' : ''}`}>
                      {msg.text}
                    </p>
                    <div className={`flex items-center gap-1 mt-0.5 ${
                      isRTL ? 'flex-row-reverse justify-start' : 'justify-end'
                    }`}>
                      <span className={`text-[10px] ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(msg.timestamp, lang)}
                      </span>
                      {msg.sender === 'me' && (
                        <span className="text-[10px] text-white/80">
                          {msg.status === 'sending' ? '⏳'
                            : msg.status === 'delivered' ? '✓✓'
                            : msg.status === 'seen' ? '✓✓'
                            : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className={`flex mb-1 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-gray-400 rounded-full inline-block"
                    style={{
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Emoji picker ────────────────────────────────────────────── */}
      {showEmoji && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-t bg-orange-50 flex-shrink-0">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-xl hover:scale-125 transition-transform"
              aria-label={`Insert emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-2 py-2">
        <div className="flex items-end gap-2">
          {/* Emoji button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v); }}
            className="flex-shrink-0 text-xl text-gray-400 hover:text-orange-500 transition-colors pb-1"
            aria-label="Emoji picker"
            title={isRTL ? 'إيموجي' : 'Emoji'}
          >
            😊
          </button>

          {/* File attachment */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 text-gray-400 hover:text-orange-500 transition-colors pb-1"
            aria-label={t.attachFile}
            title={t.attachFile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.typeMessage}
              rows={1}
              className={`w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition-colors ${
                isRTL ? 'text-right' : 'text-left'
              }`}
              style={{
                maxHeight: '100px',
                fontFamily: isRTL ? "'Cairo', 'Segoe UI', sans-serif" : "'Segoe UI', sans-serif",
              }}
              dir={isRTL ? 'rtl' : 'ltr'}
              aria-label={t.typeMessage}
            />
            {/* Character count */}
            {input.length > MAX_CHARS * 0.8 && (
              <span
                className={`absolute bottom-1 ${isRTL ? 'left-2' : 'right-2'} text-[10px] ${
                  input.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {input.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            style={{ backgroundColor: input.trim() && !isSending ? '#FF6B35' : undefined }}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              input.trim() && !isSending
                ? 'text-white shadow-md hover:opacity-90 active:scale-95'
                : 'bg-gray-100 text-gray-400'
            }`}
            aria-label={t.send}
          >
            {isSending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={isRTL ? "M12 19l-7-7 7-7M19 12H5" : "M12 19l7-7-7-7M5 12h14"} />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Bounce keyframes */}
      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
